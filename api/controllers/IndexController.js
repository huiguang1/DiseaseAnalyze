var Promise = require('es6-promise').Promise;

var pageSize = 12;

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

function getImgArticles(res){
    Article.find({
        category: '35',
        limit: 5
    }).then(function(articles){
        res.locals.ImgArticles = articles;
        res.locals.HeaderImgArticles = articles.slice(1, 4);

        return res.templet({});
    });
}

function getCategories(req, res) {
    var category = req.param("category").trim();
    var leveledCategory = category.split("_");//get categories of different levels
    var retId = 0;
    //get category of level 0
    return Category.findOne({
        dir: leveledCategory[0],
        parent: '0'
    }).then(function (cate) {
        res.locals.parentCategory = cate;
        res.locals.currentMenu[0] = cate.dir;

        //get category of level 1 (if there is)
        if (leveledCategory.length > 1) {
            return Category.findOne({
                dir: leveledCategory[1],
                parent: cate.id
            });
        }
        else
        {
            return cate;
        }
    }).then(function (cate) {
        res.locals.category = cate;
        res.locals.currentMenu[1] = cate.dir;
        //get category of level 2 (if there is)
        if (leveledCategory.length > 2) {
            return Category.findOne({
                dir: leveledCategory[2],
                parent: cate.id
            })
        }
        else {
            return cate;
        }
    }).then(function (cate) {
        if (cate.id != res.locals.category.id) {
            res.locals.category = cate;
            res.locals.currentMenu[2] = cate.dir;
        }
        retId = cate.id;
        //get level2 category list
        return Category.find({
            parent: res.locals.parentCategory.id
        });
    }).then(function (categories) {
        res.locals.categoryList = categories;
        var level3Parent = -1;
        if (leveledCategory.length >= 2)
        {
            categories.forEach(function(one, key){
                if (one.listorder == '1'){
                    level3Parent = one.id;
                }
            });
        }
        if (level3Parent != -1)
        {
            //get level3 category list
            return Category.find({
                parent: level3Parent
            });
        }
        else
        {
            return categories;
        }
    }).then(function (categories) {
        res.locals.category3List = categories;
        if (res.locals.parentCategory.id == 35) res.locals.parentCategory = null;
        return retId;
    });
}

module.exports = {
    index: function(req, res, next) {
        res.locals.view = "index";
        return res.templet({});
        res.locals.originalUrl = req.originalUrl;

        Article.find({
            category: '39',
            limit: 12,
            sort: "puttime DESC"
        }).then(function (articles) {
            res.locals.newsArticles = articles;

            return Article.find({
                category: '40',
                limit: 4,
                sort: "puttime DESC"
            })
        }).then(function (articles) {
            res.locals.centreArticles = articles;

            return Article.find({
                category: '42',
                limit: 4,
                sort: "puttime DESC"
            })
        }).then(function (articles) {
            res.locals.techArticles = articles;

            res.locals.currentMenu = new Array("home");
            res.locals.theme = "default";
            res.locals.view = "index";
            return getImgArticles(res);
        }, function reject(err) {
            return next(err);
        });
    },
/*
    index: function(req, res, next) {
        Product.find({
            sort: "listorder ASC",
            limit: 4
        }).then(function(products) {
            res.locals.products = products;

            return Fragment.find({
                varname: "home_intro"
            });
        }).then(function(fragmentes) {
            if (fragmentes) {
                fragmentes.forEach(function(one, key) {
                    res.locals[one.varname] = one.content;
                });
            }

            return Slide.find();
        }).then(function(slides) {
            res.locals.slides = slides;

            res.locals.currentMenu = "home";
            res.locals.theme = "default";
            res.locals.view = "index";
            return res.templet({});
        }, function reject(err) {
            return next(err);
        });
    },*/


    /**
     * list page
     */
    list: function(req, res, next) {
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
        var cate = req.param("category").trim();
        var id = req.param("id").trim();

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