var Promise = require('es6-promise').Promise;
var Crypto = require('crypto');
var mailer = require('../services/SMTPmailer.js');
//var searchLogger = require('../services/searchLog.js');
var config = require('../../config');

var pageSize = 10;

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

function myMD5(str) {
    var md5sum = Crypto.createHash('md5');
    md5sum.update(str);
    str = md5sum.digest('hex');
    return str;
}

function quickTemplate(req, res) {
    res.locals.lan = req.session.lan == 'eng' ? 'eng' : 'chs';
    if (typeof req.session.userName != 'undefined'){
        res.locals.userName = req.session.userName;
    } else {
        res.locals.userName = '';
    }
    return res.templet({});
}

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


module.exports = {
    /**
     * index page(main page)
     */
    index: function(req, res, next) {
        res.locals.view = "index";
        var lan = req.param('lan');
        if (typeof lan != 'undefined' && lan != '')
            req.session.lan = lan;
        res.locals.navMod = 0;

        return quickTemplate(req, res);
    },

    geneDiag: function(req, res, next) {
        res.locals.view = "gene_diag";

        res.locals.navMod = 1;

        return quickTemplate(req, res);
    },

    /**
     * list page(search result)
     */
    list: function(req, res, next) {
        var hpo = req.param("HPO");
        res.locals.view = "product_list";
        if (!hpo) return next();
        res.locals.searched = [];
        if (typeof hpo == 'string'){
            hpo = [ hpo ];
        }
        var logPhenotype = '';
        for (var i = 0;i < hpo.length;i++){
            res.locals.searched[i] = hpo[i].split('$');
            logPhenotype += res.locals.searched[i] + ';';
        }
        var guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
        res.locals.guid = guid;
        var ip = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;
        SearchLog.create({
            phenotype: logPhenotype,
            guid: guid,
            ip: ip//req.connection.remoteAddress.replace(/::ffff:/, '')//req.ip.replace(/::ffff:/, '')
        }).then(function(){
            res.locals.navMod = 0;
            if (typeof req.session.userName == 'undefined' || req.session.userName == '') {
                return Promise.reject('user');
            }
            //更新搜索记录
            return Searches.find({
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
                    search0: searchString
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

    /**
     * 列表页面
     * @param  {[category]}  目录
     */
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
     * detail page
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




        var categoryIds = [];
        if (cate == "search_result"){
            Article.findOne({
                id: id
            }).then(function(article) {
                res.locals.article = article;
                return Category.findOne({
                    id: article.category
                });
            }).then(function(category) {

                res.locals.currentMenu = new Array(category.dir);
                categoryIds[0] = category.id;

                if (category.parent != '0')
                {
                    return Category.findOne({
                        id: category.parent
                    });
                }
                else
                {
                    return category;
                }
            }).then(function(category) {
                if (category.dir != res.locals.currentMenu[0])
                {
                    res.locals.currentMenu[1] = category.dir;
                    categoryIds [1] = category.id;
                }
                if (category.parent != '0')
                {
                    return Category.findOne({
                        id: category.parent
                    });
                }
                else
                {
                    return category;
                }
            }).then(function(category) {
                if (category.dir != res.locals.currentMenu[0] && category.dir != res.locals.currentMenu[1]) {
                    res.locals.currentMenu[2] = category.dir;
                    categoryIds[2] = category.id;
                }
                res.locals.parentCategory = category.id == 35 ? null : category;
                res.locals.currentMenu.reverse();
                categoryIds.reverse();
                return Category.find({
                    parent: categoryIds[0]
                })
            }).then(function(categories) {
                res.locals.categoryList = categories;
                var level3Id = -1;
                if (categoryIds.length > 2) {
                    categories.forEach(function (one, key) {
                        if (one.listorder == '1') {
                            level3Id = one.id;
                        }
                    })
                }
                if (level3Id != -1) {
                    return Category.find({
                        parent: level3Id
                    })
                }
                else {
                    return categories;
                }
            }).then(function(categories){
                res.locals.category3List = categories;
                res.locals.view = "product_detail";
                return getImgArticles(res);
            }, function reject(err) {
                next(err);
            });
        }
        else {
            res.locals.originalUrl = req.originalUrl;

            res.locals.parentCategory = null;
            res.locals.currentMenu = [];
            res.locals.category = null;
            res.locals.categoryList = null;
            res.locals.category3List = null;
            getCategories(req, res).then(function (cateId) {
                return Article.findOne({
                    id: id,
                    category: cateId // for check purpose
                });
            }).then(function (article) {
                res.locals.article = article;

                res.locals.view = "product_detail";
                return getImgArticles(res);
            }, function reject(err) {
                next(err);
            });
        }
    },

    /**
     * 基因详情页
     */
    gene: function(req, res, next) {
        res.locals.geneID = req.param("id").trim();
        res.locals.view = "gene_detail";

        return quickTemplate(req, res);
    },

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
                '<p>请注意，该链接在10分钟后，或清除浏览器数据后将会失效，届时将需要重新注册。</p>');
            res.send('success');
        });
    },

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

    signIn: function(req, res, next) {
        if (typeof req.param("name") == 'undefined'){ //sign out
            req.session.userName = '';
            res.locals.view = "index";
            res.locals.navMod = 0;
            return quickTemplate(req, res);
        }

        var usrName = req.param("name").trim().toLowerCase();
        var psw = myMD5(req.param("password").trim());
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

    database: function(req, res, next) {
        res.locals.view = "database";
        res.locals.navMod = 3;
        return quickTemplate(req, res);
    },

    searchCase: function(req, res, next) {
        var searched = req.param("searched") ? req.param("searched").trim() : '';
        //var page = req.param("page") ? parseInt(req.param("page").trim()) : 1;
        //var skip = (page - 1) * pageSize;
        Case.find({
            //skip: skip,
            //limit: pageSize,
            Phenotype: {
                like: "%" + searched + "%"
            },
            sort: "id DESC"
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
            res.send(res.locals.cases);
        }, function(err){
            if (err == 'user')
                res.send(res.locals.cases);
            else
                next(err);
        });
    },

    watchCase: function(req, res, next) {
        if (typeof req.session.userName == 'undefined' || req.session.userName == ''){
            res.send('login');
            return;
        }
        var id = req.param("id").trim();
        Case.findOne({
            id: id
        }).then(function (aCase) {
            res.locals.aCase = aCase;
            res.locals.view = 'watch_case';
            res.locals.navMod = 3;
            if (aCase.View == 'public' || aCase.Owner == req.session.userName){
                return Promise.reject('pass');
            }
            return Request.find({
                case: id,
                requester: req.session.userName,
                status: 'accepted'
            });
        }).then(function (requests){
            if (requests.length < 1){
                res.send('permission');
                return;
            }
            return quickTemplate(req, res);
        }, function(err){
            if (err == 'pass'){
                return quickTemplate(req, res);
            }
            else {
                next(err);
            }
        });
    },

    requestView: function(req, res, next) {
        if (typeof req.session.userName == 'undefined' || req.session.userName == ''){
            res.send('login');
            return;
        }
        var id = req.body.id;
        Request.find({
            case: id,
            requester: req.session.userName,
            status: { '!': 'rejected' }
        }).then(function(requests){
            console.log(requests);
            if (requests.length > 0){
                return Promise.reject('pending');
            }
            return Request.create({
                requester: req.session.userName,
                status: 'pending',
                case: id
            })
        }).then(function(){
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

    myRequest: function(req, res, next) {
        if (typeof req.session.userName == 'undefined' || req.session.userName == ''){
            res.send('login');
            return;
        }
        Case.find({
            Owner: req.session.userName
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
                    if (search['search' + iterator] == null || search['search' + iterator].length == 0) break;
                    res.locals.searches[i] = {
                        date: search['search' + iterator].split('$')[0],
                        searchedString: []
                    };
                    var searchedString = search['search' + iterator].split('$')[1].split(',');
                    for (var j = 0;j < searchedString.length;j += 2){
                        res.locals.searches[i].searchedString[j/2] = [ searchedString[j], searchedString[j+1] ];
                    }
                    iterator = iterator-1 < 0 ? 9 : iterator-1;
                }
                console.log(res.locals.searches[0].date);
            }
            res.locals.view = 'my_request';
            return quickTemplate(req, res);
        }, function(err){
            next(err);
        });
    },

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

    upload: function(req, res, next) {
        console.log(req.body);
        res.send(200);
    },

    newCase: function(req, res , next) {
        if (typeof req.session.userName == 'undefined' || req.session.userName == ''){
            res.send('login');
            return;
        }
        res.locals.view = 'new_case';
        return quickTemplate(req, res);
    },

    addCase: function(req, res , next) {
        if (typeof req.session.userName == 'undefined' || req.session.userName == ''){
            res.send('login');
            return;
        }
        req.body.Owner = req.session.userName;
        Case.create(req.body).then(function(aCase){
            res.send('success');
        }, function(err){
            res.send('error');
        });
    },


    /*test: function(req, res, next) {
        User.find({}).then(function (users){
            console.log('then1');
            return Promise.reject('Reject!');
        }, function (err) {
            console.log('err1: '+ err);
            res.locals.view = 'index';
            return quickTemplate(req, res);
        }).then(function(input){
            console.log('input1: ' + input);
            console.log('then2');
            resolve('Resolve!');
        }, function (err) {
            console.log('err2: '+ err);
            res.locals.view = 'index';
            return quickTemplate(req, res);
        }).then(function(input){
            console.log('input2: ' + input);
            res.locals.view = 'index';
            return quickTemplate(req, res);
        }, function (err) {
            console.log('err3: '+ err);
            res.locals.view = 'index';
            return quickTemplate(req, res);
        });

    },*/

    /**
     * 详情页 
     * @param  {[category]}  目录
     * @param  {[id]}  ID
     */
    /*detail: function(req, res, next) {
        var category = req.param("category").trim();
        var id = req.param("id").trim();
        var model_str = "category";
        var data= null;
        var model;

        var current_category = null;
        Promise.resolve().then(function() {
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

                model_str = Util.firstUper(current_category.model);
                model = eval("model = " + model_str);

                return model.findOne({
                    id: id
                });
            })

        .then(function(rs) {
                data = rs;
                res.locals.data = rs;
                res.locals[current_category.model] = rs;
                console.log(current_category.model);
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
                res.locals.view = current_category.tpldetail ? category.tpldetail : current_category.model + "_detail";
                if(data.tpl){
                    res.locals.view = data.tpl;
                }
                return res.templet({});
            }, function(err) {
                return next(err);
            });
    }*/

    /**
     * 搜索，返回搜索结果页
     * @param req
     * @param res
     * @param next
     */
    search: function(req, res, next) {
        var searchWord = req.param("keyWord", "") || "";
        res.locals.searchWord = searchWord;

        if (searchWord === ""){
            res.locals.articleList = [];res.locals.currentMenu = new Array(0);
            res.locals.theme="default";
            res.locals.view="search_result";
            return getImgArticles(res);
        }
        else {
            var page = req.param("page") ? parseInt(req.param("page").trim()) : 1;
            var skip = (page - 1) * pageSize;
            res.locals.currentPage = page;

            res.locals.originalUrl = req.originalUrl.split('?', 1) + "?keyWord=" + searchWord;
            Article.count({
                or: [
                    {
                        title: {
                            like: "%" + searchWord + "%"
                        }
                    },
                    {
                        keywords: {
                            like: "%" + searchWord + "%"
                        }
                    }
                ]
            }).then(function(articleCount) {
                var pageCount = (articleCount - 1) / pageSize + 1;
                res.locals.pages = getNArray(pageCount);

                return Article.find({
                    or: [
                        {
                            title: {
                                like: "%" + searchWord + "%"
                            }
                        },
                        {
                            keywords: {
                                like: "%" + searchWord + "%"
                            }
                        }
                    ],
                    skip: skip,
                    limit: pageSize
                });
            }).then(function (articles) {
                res.locals.articleList = articles;

                res.locals.currentMenu = new Array(0);
                res.locals.theme = "default";
                res.locals.view = "search_result";
                return getImgArticles(res);
            }, function reject(err) {
                next(err);
            });
        }
    },

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
    }
};