/**
 * 控制器。
 * 数据库查询语句参考：http://sailsjs.com/documentation/concepts/models-and-orm/query-language
 */

var Promise = require('es6-promise').Promise;
var Crypto = require('crypto');
var mailer = require('../services/SMTPmailer.js');
//var searchLogger = require('../services/searchLog.js');
var config = require('../../config');
var fs = require('fs');
var http_req = require('request');

var pageSize = 16;

var dynamicDir = '.tmp/uploads/';

/**
 * Construct an array of [ 1, 2, ..., n ]
 * @param n
 */
function getNArray(n){
    var arr = [];
    for (var i=1;i <= n;i++){
        arr[i-1] = i;
    }
    return arr;
}

/**
 * 生成str的MD5
 */
function myMD5(str) {
    str += 'TBDL';
    var md5sum = Crypto.createHash('md5');
    md5sum.update(str);
    str = md5sum.digest('hex');
    return str;
}

/**
 * Controller的结尾处，用此函数返回EJS模版，需在调用前将res.locals.view赋值为 EJS文件名（不包括扩展名）
 * @param req
 * @param res
 * @returns {*}
 */
function quickTemplate(req, res) {
    res.locals.lan = req.session.lan == 'eng' ? 'eng' : 'chs';
    if (typeof req.session.userName != 'undefined'){
        res.locals.userName = req.session.userName;
    } else {
        res.locals.userName = '';
    }
    return res.templet({});
}

/**
 * Controller的结尾处，用此函数返回错误页面EJS模版，err变量决定显示给用户的错误信息
 * @param req
 * @param res
 * @param err
 * @returns {*}
 */
function errTemplate(req, res, err) {
    res.locals.lan = req.session.lan == 'eng' ? 'eng' : 'chs';
    if (typeof req.session.userName != 'undefined'){
        res.locals.userName = req.session.userName;
    } else {
        res.locals.userName = '';
    }
    res.locals.err = err;
    res.locals.view = 'error';
    return res.templet({});
}

/**
 * module.exports的以下每个成员都是一个控制器，创建一个控制器后记得在config/routes.js里面把控制器和URL绑定
 * 每个控制器都必须接受三个参数：req, res, next
 */
module.exports = {
    /**
     * 主页，关于req, res, next的详细信息，可在sails.js文档中查找。
     * @param req 传入请求(request)
     * @param res 回复（respond）
     * @param next 使用该函数返回错误页面（return next([err]) ）。需要将错误原因通知给用户时，请用errTemplate代替它。
     * @returns {*}
     */
    index: function(req, res, next) {
        res.locals.view = "index";
        //lan是语言参数，目前支持中英文
        var lan = req.param('lan');
        if (typeof lan != 'undefined' && lan != '')
            req.session.lan = lan;
        //navMod表示用户目前所在的模块（如症状诊断）
        res.locals.navMod = 0;

        return quickTemplate(req, res);
    },

    /**
     * 基因诊断页
     * @param req
     * @param res
     * @param next
     * @returns {*}
     */
    geneDiag: function(req, res, next) {
        res.locals.view = "gene_diag";
        res.locals.userName = req.session.userName;
        res.locals.navMod = 1;

        return quickTemplate(req, res);
    },

    /**
     * 症状诊断结果页
     * @param req
     * @param res
     * @param next
     * @returns {*}
     */
    list: function(req, res, next) {
        var hpo = req.param("HPO");
        res.locals.view = "product_list";
        if (!hpo) return next();
        res.locals.searched = [];
        if (typeof hpo == 'string'){
            hpo = [ hpo ];
        }
        //在SearchLog中需要记录每次搜索。
        var logPhenotype = '';
        for (var i = 0;i < hpo.length;i++){
            res.locals.searched[i] = hpo[i].split('$');
            logPhenotype += res.locals.searched[i] + ';';
        }

        res.locals.guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        var ip = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;
        //数据库的操作由sails.js提供接口完成，并用es6-promise实现异步编程。
        SearchLog.create({//SearchLog是针对所有用户的搜索日志
            phenotype: logPhenotype,
            guid: res.locals.guid,
            ip: ip//req.connection.remoteAddress.replace(/::ffff:/, '')//req.ip.replace(/::ffff:/, '')
        }).then(function(){//.then方法即es6-promise提供的回调方法，代替传统的回调，避免回调地狱。
            res.locals.navMod = 0;
            if (typeof req.session.userName == 'undefined' || req.session.userName == '') {
                return Promise.reject('user');
            }
            return Searches.find({//Searches是针对登录用户的搜索日志
                user: req.session.userName
            })
        }).then(function(searches) {
            var searchString = new Date() + '$' + res.locals.searched;
            if (searches.length > 0){
                var search = searches[0];
                var iterator = (search.iterator + 1) > 9 ? 0 : search.iterator + 1;
                var updateBody = { iterator: iterator };
                updateBody['search'+search.iterator] = searchString;
                return Searches.update({ user: req.session.userName }, updateBody);
            }
            else {
                return Searches.create({
                    user: req.session.userName,
                    search0: searchString,
                    iterator: 1
                });
            }
        }).then(function(search){
            return quickTemplate(req, res);
        }, function(err) {
            if (err == 'user'){
                return quickTemplate(req, res);
            }
            console.log(err);
            next(err);
        });
/*
        var hpo = req.param("HPO");
        var http = require('http');
        new Promise(function (resolve, rej) {
            var req = http.request({
                hostname: '202.121.178.141',
                path: '/cgi-bin/MDPA/NodeInfo.cgi?ID=' + hpo[0].substr(3)
            }, function(res) {
                resolve(res);
            });
            req.on('error', function(e){
                console.log("request error, try again");
            });
            req.end();
        }).then(function(res){
            console.log(res);
        }, function(err) {
            return next(err);
        });
        return res.templet({});



        var promises = [];
        for (var i=0;i<hpo.length;i++){
            promises[i] = new Promise(function (resolve, rej) {
                var req = http.request({
                    hostname: '202.121.178.141',
                    path: '/cgi-bin/MDPA/NodeInfo.cgi?ID=' + hpo[i].substr(3)
                }, function(res) {
                    resolve(res);
                });
                req.on('error', function(e){
                    console.log("request error, try again");
                });
                req.end();
            });
        }
        Promise.all(promises).then(function (res){
            console.log("res is: "+ res);
        });

        return res.templet({});






        var page = req.param("page") ? parseInt(req.param("page").trim()) : 1;

        var skip = (page - 1) * pageSize;
        res.locals.currentPage = page;
        res.locals.originalUrl = req.originalUrl.split('?', 1);

        res.locals.parentCategory = null;
        res.locals.currentMenu = [];
        res.locals.category = null;
        res.locals.categoryList = null;
        res.locals.category3List = null;
        var categoryId = null;
        getCategories(req, res).then(function (cateId) {
            categoryId = cateId;
            return Article.count({category: cateId});
        }).then(function (articleCount) {
            var pageCount = (articleCount - 1) / pageSize + 1;
            res.locals.pages = getNArray(pageCount);
            return Article.find({
                category: categoryId,
                skip: skip,
                limit: pageSize,
                sort: "puttime DESC"
            })
        }).then(function(articles){
            res.locals.articleList = articles;

            //prepare url
            res.locals.view = "product_list";
            return getImgArticles(res);
        }, function(err) {
            return next(err);
        });
        */
    },

    /*list: function(req, res, next) {
        var category = req.param("category").trim();
        var model_str = "category";
        var model = null;

        var current_category = null;
        Promise.resolve().then(function() {
            return Article.find({
                category: '1',
                limit: 12
            })
        }).then(function(articles) {
            res.locals.articles1 = articles;
                if (category) {
                    return Category.findOne({
                        dir: category
                    });
                } else {
                    return new Promise(function(resolve, reject) {
                        return resolve(null);
                    });
                }
            })
            .then(function(category) {
                current_category = category;
                return Category.getTree({
                    model: category.model
                });
            })
            .then(function(getTree) {
                res.locals.categorys = getTree;

                var current_page = req.query['p'] || req.query['page'] || 1;
                var pageContion = {
                    sort: "id DESC",
                    limit: current_category.pagesize ? current_category.pagesize : 10
                };

                if (current_category) {
                    pageContion.where = {
                        category: current_category.id
                    };
                }

                model_str = Util.firstUper(current_category.model);
                model = eval("model = " + model_str);

                return Pagination(model, {
                    current_page: current_page
                }, pageContion);
            })
            .then(function(rs) {
                res.locals.data = rs.data;
                res.locals.paging = rs.paging;

                // 获取热门数据
                return model.find({
                    limit: 5
                });
            })
            .then(function(hot_records) {
                res.locals.hot_records = hot_records;

                res.locals.category = current_category;
                res.locals.currentMenu = category;
                res.locals.theme = "default";
                res.locals.view = current_category.tpllist ? current_category.tpllist : current_category.model + "_list";

                return res.templet({});
            }, function(err) {
                return next(err);
            });
    },*/

    /**
     * 症状详情页，显示某个症状详情
     * @param req
     * @param res
     * @param next
     * @returns {*}
     */
    detail: function(req, res, next) {
        var id = req.param("id").trim();
        res.locals.diseaseID = id;
        var hpo = req.param("HPO");
        if (typeof(hpo)=='undefined'){
            hpo = '[]';
        }
        res.locals.searched = hpo;
        res.locals.view = "product_detail";

        return quickTemplate(req, res);
    },

    /**
     * 基因详情页
     */
    gene: function(req, res, next) {
        res.locals.geneID = req.param("id").trim();
        res.locals.view = "gene_detail";

        return quickTemplate(req, res);
    },

    /**
     * 接收用户的用户名、密码输入，发送邮件，准备创建新用户
     * @param req
     * @param res
     * @param next
     */
    signUp: function(req, res, next) {
        var usrName = req.param("name").trim().toLowerCase();
        var psw = myMD5(req.param("password").trim());
        var email = req.param("email").trim();
        var verification = req.param("verification").trim();
        if (verification != req.session.login.randomcode){
            res.send('verification');
            return;
        }

        //注意，用户名对大小写不敏感
        User.find({
            or: [{ name: usrName }, { email: email } ]
        }).then(function(users){
            if (users.length > 0) {
                res.send('exist');
                return;
            }
            var secret = myMD5((new Date()).toTimeString() + 'gps');
            req.session.signUp = {
                usrName: usrName,
                psw: psw,
                email: email,
                md5: secret
            };
            mailer.send(email,'<p>您正在验证自己的注册，请点击以下链接进行验证：</p>' +
                '<a href="' + config.host +'/verify?pass='+secret+'">请点击我</a>' +
                '<p>请注意，该链接在10分钟后，或清除浏览器数据后将会失效，届时将需要重新注册。</p>',
                'GPS网站注册验证');
            res.send('success');
        });
    },

    /**
     * 验证注册邮件中的验证码
     * @param req
     * @param res
     * @param next
     * @returns {*}
     */
    verify: function(req, res, next) {
        if (typeof req.param("pass") == 'undefined'){
            return errTemplate(req,res,'链接无效。');
        }
        var secret = req.param("pass").trim();
        if (typeof req.session.signUp == 'undefined' || secret != req.session.signUp.md5){
            return errTemplate(req,res,'链接过期，请重新注册。');
        }
        User.create({
            name: req.session.signUp.usrName,
            password: req.session.signUp.psw,
            authorization: 0,
            email: req.session.signUp.email
        }).then(function (user) {
            req.session.userName = user.name;
            return errTemplate(req, res, '恭喜，注册成功！您可以在右上角“个人中心”处查看信息。')
        }, function(err){
            return errTemplate(req,res,'抱歉，该用户已存在，请登录或重新注册。');
        });
    },

    /**
     * 登录验证，或登出
     * @param req
     * @param res
     * @param next
     * @returns {*}
     */
    signIn: function(req, res, next) {
        if (typeof req.param("name") == 'undefined'){ //登出
            req.session.userName = '';
            res.locals.view = "index";
            res.locals.navMod = 0;
            return quickTemplate(req, res);
        }

        var usrName = req.param("name").trim().toLowerCase();
        var psw = myMD5(req.param("password"));
        var verification = req.param("verification").trim();
        if (verification != req.session.login.randomcode){
            res.send('verification');
            return;
        }
        User.find({
            name: usrName,
            password: psw
        }).then(function (users) {
            if (users.length < 1){
                res.send('exist');
            }
            else {
                req.session.userName = usrName;
                res.send('success');
            }
        }, function(err){
            res.send('error');
        });
    },

    /**
     * 病历列表页
     * @param req
     * @param res
     * @param next
     * @returns {*}
     */
    database: function(req, res, next) {
        res.locals.view = "database";
        res.locals.navMod = 3;
        return quickTemplate(req, res);
    },

    /**
     * 返回病例搜索结果
     * @param req
     * @param res
     * @param next
     */
    searchCase: function(req, res, next) {
        var searched = req.param("searched") ? req.param("searched").trim() : '';
        var page = req.param("page") ? parseInt(req.param("page").trim()) : 0;
        var skip = page * pageSize;

        var queryBody = {};
        if (searched != ''){//存在语法Bug，目前仅支持单个症状搜索
            queryBody.Phenotype = {};
            searched = searched.substr(3);
            searched = searched.split('HP:');
            queryBody.Phenotype.contains = searched;
        }
        Case.count(queryBody).then(function(num){
            res.locals.finalPage = (num <= skip + pageSize);
            queryBody.skip = skip;
            queryBody.limit = pageSize;
            queryBody.sort = "id DESC";

            return Case.find(queryBody);
        }).then(function (cases) {
            res.locals.cases = cases;
            if (typeof req.session.userName == 'undefined' || req.session.userName == '') {
                return Promise.reject('user');
            }
            var casesId = [];
            for (var i = 0;i < cases.length;i++){
                casesId[i] = { case: cases[i].id };
            }
            return Request.find({
                or: casesId,
                requester: req.session.userName,
                status: 'accepted'
            });
        }).then(function (requests){
            for (var i = 0;i < res.locals.cases.length;i++){
                if (res.locals.cases[i].Owner == req.session.userName){
                    res.locals.cases[i].viewable = 'yes';
                }
                for (var j = 0;j < requests.length;j++){
                    if (requests[j].case == res.locals.cases[i].id){
                        res.locals.cases[i].viewable = 'yes';
                        break;
                    }
                }
            }
            res.send({cases: res.locals.cases, finalPage: res.locals.finalPage});
        }, function(err){
            if (err == 'user')
                res.send({cases: res.locals.cases, finalPage: res.locals.finalPage});
            else
                next(err);
        });
    },

    /**
     * 查看某个病例详情，带有对用户的权限检查
     * @param req
     * @param res
     * @param next
     */
    watchCase: function(req, res, next) {
        if (typeof req.session.userName == 'undefined' || req.session.userName == ''){
            res.send('login');
            return;
        }
        var id = req.param("id").trim();
        var pass = false;
        Case.findOne({
            id: id
        }).then(function (aCase) {
            if (aCase == undefined){
                return Promise.reject('exist')
            }
            res.locals.aCase = aCase;
            if (aCase.View == 'public' || aCase.Owner == req.session.userName){
                pass = true;
            }
            return Request.find({
                case: id,
                requester: req.session.userName,
                status: 'accepted'
            });
        }).then(function (requests){
            if (requests.length > 0){
                pass = true;
            }
            if (!pass){
                return Promise.reject('permission');
            }
            return CaseChrom.find({
                id: id
            });
        }).then(function(caseChroms){
            res.locals.caseChroms = caseChroms;

            return CaseGene.find({
                id: id
            });
        }).then(function(caseGenes){
            res.locals.caseGenes = caseGenes;
            res.locals.view = 'watch_case';
            res.locals.navMod = 3;

            return quickTemplate(req, res);
        },function (err){
            if (err == 'permission'){
                return errTemplate(req, res, '抱歉，您没有权限浏览该病例。');
            }
            if (err == 'exist'){
                return errTemplate(req, res, '抱歉，该病例不存在。');
            }
            console.log(err);
            return next(err);
        });
    },

    /**
     * 对其他用户发出查看病例的请求
     * @param req
     * @param res
     * @param next
     */
    requestView: function(req, res, next) {
        if (typeof req.session.userName == 'undefined' || req.session.userName == ''){
            res.send('login');
            return;
        }
        var id = req.body.id;
        Request.find({
            case: id,
            requester: req.session.userName,
            status: { '!': 'rejected' }//当被拒绝后，仍可再发送，但是若在核审中则不可再发送
        }).then(function(requests){
            if (requests.length > 0){
                return Promise.reject('pending');
            }
            return Request.create({
                requester: req.session.userName,
                status: 'pending',
                case: id
            })
        }).then(function(createdRequest){
            res.send('success')
        }, function(err) {
            if (err == 'pending'){
                res.send('pending')
            } else {
                console.log(err);
                res.send('error')
            }
        });
    },

    /**
     * 个人中心页
     * @param req
     * @param res
     * @param next
     */
    myRequest: function(req, res, next) {
        if (typeof req.session.userName == 'undefined' || req.session.userName == ''){
            res.send('login');
            return;
        }
        Request.find({
            requester: req.session.userName
        }).then(function(requests) {
            res.locals.requestsSent = requests;

            return Case.find({
                Owner: req.session.userName
            })
        }).then(function(cases){
            res.locals.cases = cases;
            res.locals.requests = [];
            if (cases.length < 1){
                return Promise.reject('cases');
            }
            var caseId = [];
            for (var i = 0;i < cases.length;i++) {
                caseId[i] = { case: cases[i].id };
            }
            return Request.find({
                or: caseId
            })
        }).then(function(requests) {
            res.locals.requests = requests;

            return Searches.find({
                user: req.session.userName
            });
        }, function(err){
            if (err != 'cases'){
                console.log(err);
                return next(err);
            }
            return Searches.find({
                user: req.session.userName
            });
        }).then(function(searches){
            res.locals.searches = [];
            if (searches.length > 0){
                var search = searches[0];
                var iterator = search.iterator;
                for (var i = 0;i < 9;i++){
                    iterator = iterator-1 < 0 ? 9 : iterator-1;
                    if (search['search' + iterator] == null || search['search' + iterator].length == 0) break;
                    res.locals.searches[i] = {
                        date: search['search' + iterator].split('$')[0],
                        searchedString: []
                    };
                    var searchedString = search['search' + iterator].split('$')[1].split(',');
                    for (var j = 0;j < searchedString.length;j += 2){
                        res.locals.searches[i].searchedString[j/2] = [ searchedString[j], searchedString[j+1] ];
                    }
                }
            }
            res.locals.view = 'my_request';
            return quickTemplate(req, res);
        }, function(err){
            next(err);
        });
    },

    /**
     * 对请求进行核审（接受或拒绝）
     * @param req
     * @param res
     * @param next
     */
    approveRequest: function(req, res, next) {
        if (typeof req.session.userName == 'undefined' || req.session.userName == ''){
            res.send('login');
            return;
        }
        var id = req.body.id;
        var isAccept = req.body.isAccept;
        Request.update({ id: id }, {
            status: isAccept == 'true' ? 'accepted' : 'rejected'
        }).then(function (){
            res.send('success');
        }, function (err) {
            next(err);
        });
    },

    /**
     * 改变一个病例的权限状态
     * @param req
     * @param res
     * @param next
     */
    changePermission: function(req, res, next) {
        if (typeof req.session.userName == 'undefined' || req.session.userName == ''){
            res.send('login');
            return;
        }
        var id = req.body.id;
        var permission = req.body.permission;
        Case.update({ id: id }, {
            View: permission
        }).then(function (){
            res.send('success');
        }, function (err) {
            next(err);
        });
    },

    /**
     * 新建病例页
     * @param req
     * @param res
     * @param next
     * @returns {*}
     */
    newCase: function(req, res , next) {
        if (typeof req.session.userName == 'undefined' || req.session.userName == ''){
            res.send('login');
            return;
        }
        res.locals.view = 'new_case';
        return quickTemplate(req, res);
    },

    /**
     * 新建病例
     * @param req
     * @param res
     * @param next
     */
    addCase: function(req, res , next) {
        if (typeof req.session.userName == 'undefined' || req.session.userName == ''){
            res.send('login');
            return;
        }

        req.file('pic').upload({
            dirname : 'casePictures'
        }, function (err, uploadedFiles) {
            if (err) {
                return res.send('error');
            }
            if (uploadedFiles.length > 0){
                var fileName = uploadedFiles[0].fd;
                req.body.Picture = fileName.substr(fileName.lastIndexOf('\\')+1, fileName.length);
            }

            req.body.Owner = req.session.userName;
            var caseId;

            Case.create(req.body).then(function(aCase) {
                caseId = aCase.id;
                if (req.body.chromsInput == '' || req.body.chromsInput == undefined) return;
                var chromsInput = JSON.parse(req.body.chromsInput);
                chromsInput.forEach(function (v, k) {
                    v['id'] = caseId;
                });
                return CaseChrom.create(chromsInput);
            }).then(function(chroms){
                if (req.body.genesInput == '' || req.body.genesInput == undefined) return;
                var genesInput = JSON.parse(req.body.genesInput);
                genesInput.forEach(function (v, k){
                    v['id'] = caseId;
                });
                return CaseGene.create(genesInput);
            }).then(function(genes){
                res.send('success');
            }, function(err){
                console.log(err);
                res.send('error');
            })
        });

    },

    /**
     * 载入病例图片
     * @param req
     * @param res
     * @param next
     * @returns {*}
     */
    casePicture: function(req, res, next) {
        if (typeof req.session.userName == 'undefined' || req.session.userName == ''){
            return errTemplate(req,res,'访问出错，请登录。');
        }
        var id = req.param("id").trim();
        fs.open(dynamicDir+'casePictures/'+id, 'r', function (err, fd){
            if (err){
                console.log(err);
                return res.send('找不到该文件');
            }
            var readBuffer = new Buffer(2 * 1024 * 1024);
            fs.read(fd, readBuffer, 0, readBuffer.length, 0, function (err, readBytes){
                if (err) {
                    return res.send('文件读取失败');
                }
                res.send(readBuffer);
            })
        })
    },

    /**
     * 生成验证码图片
     * @param req
     * @param res
     * @param next
     */
    randompng: function(req,res,next){
        var code = '0123456789';
        var length = 4;
        var randomcode = '';
        for (var i = 0; i < length; i++) {
            randomcode += code[parseInt(Math.random() * 1000) % code.length];
        }
        // 保存到session
        if (null == req.session.login) {
            req.session.login = {};
        }
        req.session.login.randomcode = randomcode;
        // 输出图片
        var p = new captchapng(80,30,parseInt(randomcode)); // width,height,numeric captcha
        p.color(255, 255, 255, 0);  // First color: background (red, green, blue, alpha)
        p.color(80, 80, 80, 255); // Second color: paint (red, green, blue, alpha)
        var img = p.getBase64();
        var imgbase64 = new Buffer(img,'base64');
        res.writeHead(200, {
            'Content-Type': 'image/png'
        });
        res.end(imgbase64);
    },

    /**
     * 找回密码页，或更新密码
     * @param req
     * @param res
     * @param next
     * @returns {*}
     */
    newPassword: function (req, res, next) {
        res.locals.loggedIn = req.session.userName != undefined && req.session.userName != '';
        if (req.method.toUpperCase() == 'POST'){//更新密码
            if (!res.locals.loggedIn){
                return errTemplate(req, res, '错误，您需要先登录。');
            }
            if (req.body.password == undefined || req.body.password.length == 0){
                return errTemplate(req, res, '错误，请输入密码');
            }
            var psw = myMD5(req.body.password);
            User.update({ name: req.session.userName }, { password: psw}).then(function () {
                return res.send('ok');
            }, function (err) {
                return next(err);
            });
        } else {
            //找回密码页
            res.locals.view = 'new_password';
            return quickTemplate(req, res);
        }
    },

    /**
     * 找回密码邮箱验证码验证，或发出找回密码验证邮件
     * @param req
     * @param res
     * @param next
     */
    emailVerify: function (req, res, next) {
        if (req.param("email") != undefined && req.param("email") != ''){//发出找回密码验证邮件
            var email = req.param("email").trim();
            User.find({ email: email }).then(function (users) {
                if (users.length > 0){
                    var secret = myMD5((new Date()).toTimeString() + 'gps' + email);
                    req.session.emailVerifySecret = secret;
                    req.session.prepareUserName = users[0].name;
                    mailer.send(email,'<p>您正准备重置diseasegps网站的密码，请复制以下验证码进行验证：</p>' +
                        '<p>' + secret + '</p>'
                        + '<p>如果您没有使用我们的系统发出此邮件，请忽略。</p>',
                        'GPS网站密码重置');
                    res.send('ok');
                } else {
                    res.send('exist')
                }
            });
        } else if (req.param("code") != undefined && req.param("code") != '') {//找回密码邮箱验证码验证
            if (req.session.emailVerifySecret == undefined || req.session.emailVerifySecret == ''){
                return res.send('exist');
            }
            var verify = req.param("code").trim();
            if (verify == req.session.emailVerifySecret){
                req.session.userName = req.session.prepareUserName;
                res.send('ok');
            } else {
                res.send('code');
            }
        }
    },


    //测试用
    test: function (req, res, next) {
        User.findOne({
            name: 'admin'
        }).then(function(user){
            http_req({
                url: 'http://202.121.178.141/cgi-bin/MDPA/FileOperator.cgi',
                method: "POST",
                formData: {
                    user: 'admin',
                    key: user.password
                }
            }, function(error, response, body) {
                console.log('error: '+error);
                console.log('response: '+response);
                console.log('body: '+body);
            });
        });
    }
};