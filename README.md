# 介绍
    
本项目分为门户和论坛两部分。使用的模版分别是：
 
* `Nodecms` (https://github.com/linksgo2011/nodecms)
* `Nodeclub` (https://github.com/cnodejs/nodeclub)

涉及相关基础Docker镜像：

* `node:4` : 10.1.64.89:5000/base/node:4
* `mysql:latest` : 172.17.19.41:5000/base/mysql
* `mango:latest` : 172.17.19.41:5000/mongo
* `redis:latest` : 172.17.19.41:5000/redis 
* `nginx:latest` : 172.17.19.41:5000/base/nginx


## 安装

### 1. 克隆代码
部署服务器的Docker私有镜像库只能通过10.1.64.89服务器访问，故进入服务器

```bash
$ ssh root@10.1.64.89
```
密码：`smyadmin`

新建一个文件夹并进入该文件夹，例如：

```bash
$ mkdir wonders
$ cd wonders
```

使用Git把项目克隆到本地。（在此前需要被加入到该项目中，克隆时会提示输入Git的用户名和密码）

```bash
$ git clone http://10.1.9.205/WSGCZX_Site/WebSite.git
$ git clone http://10.1.9.205/WSGCZX_Site/bbs.git
```

### 2. 打包并上传门户镜像（请注意，用build命令打包成镜像后将无法修改其中的文件）
打包门户镜像

```bash
$ cd Website
$ docker build -t 172.17.19.41:5000/nodecms .
```
如果因为该镜像已经存在而无法打包，可将其删除
       
```bash 
$ docker rmi 172.17.19.41:5000/nodecms 
```
        
上传镜像
        
```bash
$ docker push 172.17.19.41:5000/nodecms
```

### 3. 配置、打包并上传论坛镜像
配置论坛镜像

```bash
$ cd ../bbs
$ vim config.js
```     
   
* 若要配置域名，找到以下一行进行配置。以下为原本的配置，主机以IP表示，当本平台拥有域名后需要更改为域名。（请保留"/bbs"）

```bash
host: '172.17.19.41/bbs'
```

* 配置邮箱（此邮箱用于接受注册激活邮件，必须有smtp服务）

```javascript
    // 邮箱配置
    mail_opts: {
        host: 'smtp.126.com',
        port: 465,
        auth: {
            user: 'WangExplosion@126.com',
            pass: 's1a2i3l4i5n6m7u'
        }
    },
```

* 打包并上传论坛镜像

```bash
$ docker build -t 172.17.19.41:5000/nodeclub .
$ docker push 172.17.19.41:5000/nodeclub
```

### 4.部署服务器获取镜像

连接到部署服务器

```bash
$ ssh wonders@172.17.19.41 -p 22201
```
密码：`wanda2016`


下载门户镜像（若出现已存在的问题，则先将其删除。另外，第一次sudo会需要密码：`wanda2016`）

```bash        
$ sudo docker pull 172.17.19.41:5000/nodecms
```

下载论坛镜像

```bash
$ sudo docker pull 172.17.19.41:5000/nodeclub
```

### 5.部署服务器启动镜像        
启动一个mysql容器（请勿在此更改MYSQL_ROOT_PASSWORD的值，因为mysql文件夹是服务器中挂载的，所以密码已经确定为rootadmin）

```bash
$ sudo docker run -d -e MYSQL_ROOT_PASSWORD=rootadmin --name nodecmsdb -v ~/mysql:/var/lib/mysql -p 3306:3306 172.17.19.41:5000/base/mysql:latest 
```

* 若因为已经存在相同名字的容器而无法启动，则先将其删除。接下来其他容器启动时也一样。

```bash        
$ sudo docker stop nodecmsdb
$ sudo docker rm nodecmsdb
```

* 启动门户容器，至此门户部分部署完成。

```bash
$ sudo docker run -d -p 4000:4000 -e DATABASE_HOST=nodecmsdb -e DATABASE_PORT=3306 -e PORT=4000 --link nodecmsdb:cmstodb --name nodecms 172.17.19.41:5000/nodecms
```

* 为mongoDB启动一个数据卷容器，目的是把数据内容分离出来。

```bash
$ sudo docker run -ti -v /usr/local/mongodb/data --name dbdata 127.0.0.1:5000/base/ubuntu
```

* 启动mongoDB容器，配置用户和密码（rootwonders为用户管理帐号，wonders为node_club_dev数据库的使用者帐号）

```bash        
$ sudo docker run -d -p 3000:3000 --name mongo --restart=always --volumes-from dbdata 172.17.19.41:5000/mongo --auth --bind_ip 127.0.0.1
$ sudo docker exec -it mongo /bin/bash
# mongo
> use admin
> db.createUser({ user: "rootwonders",pwd: "rootwanda2016",customData:{name:"root"},roles:[{ role: "userAdminAnyDatabase",db: "admin" }]})
> db.auth('rootwonders','rootwanda2016')
> use node_club_dev
> db.createUser({ user: "wonders",pwd: "wanda2016",customData:{name:"wanda"},roles:[{ role: "dbAdmin",db: "node_club_dev" },{ role: "readWrite", db: "node_club_dev"}]})
> exit
# exit
```

* 启动Redis容器，它共享MongoDB容器的网络环境

```bash
$ sudo docker run --name redis -d --net=container:mongo redis:ipconstrained
```
        
* 启动BBS服务器，它也与MongoDB容器共享网络环境。至此BBS部分部署完成

```bash
$ sudo docker run -d --net=container:mongo -e BBS_PORT=3000 -e MONGODB_HOST=127.0.0.1 -e MONGODB_USER=wonders -e MONGODB_PWD=wanda2016 -e REDIS_HOST=127.0.0.1 -e REDIS_PORT=6379 -e REDIS_PWD=wanda2016 --name nodeclub 68f8
```

* 编写Nginx配置文件：nginx.conf。

```bash
$ cd ~
$ vim nginx.conf
```      

配置文件如下（在“deploy_file”项目中也有一份副本）：

```
worker_processes  1;

events {
    worker_connections  1024;
}


http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;

    server {
        listen       8080;
        server_name  localhost;

        location = /bbs {
            proxy_pass http://nodeclub:3000/;
        }
        location ^~ /public/ {
            proxy_pass http://nodeclub:3000/public/;
        }
        location /bbs/ {
            proxy_pass http://nodeclub:3000/;
        }






        location = / {
            proxy_pass http://nodecms:4000;
        }
        location ^~ /templates/default/ {
            proxy_pass http://nodecms:4000/templates/default/;
        }
        location / {
            proxy_pass http://nodecms:4000/;
        }


        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }
    }
}
```
  
* 启动Nginx容器：

```bash
$ sudo docker run -d -p 80:8080 --name nginx --link nodecms:nginxtocms --link mongo:nodeclub -v ~/nginx.conf:/etc/nginx/nginx.conf:ro 172.17.19.41:5000/base/nginx 
```
        
**至此，全部部署完成。**

## 测试 

主页地址： `http://172.17.19.41/ `

论坛地址： `http://172.17.19.41/bbs`

门户后台地址： `http://172.17.19.41/admin/user/login `

门户管理员帐号： `admin` 密码：`Gcwszx@2016`

注：论坛管理员帐号需要自己注册。注册后要手动进入mongo容器修改其权限，将is_admin和active都改为true

```bash
$ sudo docker exec -it mongo /bin/bash
# mongo
> use node_club_dev
> db.auth('wonders','wanda2016')
> db.users.update(...)
```
