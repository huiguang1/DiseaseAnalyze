/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes map URLs to views and controllers.
 *
 * If Sails receives a URL that doesn't match any of the routes below,
 * it will check for matching files (images, scripts, stylesheets, etc.)
 * in your assets directory.  e.g. `http://localhost:1337/images/foo.jpg`
 * might match an image file: `/assets/images/foo.jpg`
 *
 * Finally, if those don't match either, the default 404 handler is triggered.
 * See `api/responses/notFound.js` to adjust your app's 404 logic.
 *
 * Note: Sails doesn't ACTUALLY serve stuff from `assets`-- the default Gruntfile in Sails copies
 * flat files from `assets` to `.tmp/public`.  This allows you to do things like compile LESS or
 * CoffeeScript for the front-end.
 *
 * For more information on configuring custom routes, check out:
 * http://sailsjs.org/#!/documentation/concepts/Routes/RouteTargetSyntax.html
 */

module.exports.routes = {

  /***************************************************************************
   *                                                                          *
   * Make the view located at `views/homepage.ejs` (or `views/homepage.jade`, *
   * etc. depending on your default view engine) your home page.              *
   *                                                                          *
   * (Alternatively, remove this and add an `index.html` file in your         *
   * `assets` directory)                                                      *
   *                                                                          *
   ***************************************************************************/
  '/': {
    controller: 'IndexController'
  },

  '/gene_diag': {
    controller: 'IndexController',
    action: 'geneDiag'
  },


  '/list': {
    controller: 'IndexController',
    action: 'list'
  },

  '/disease/:id': {
    controller: 'IndexController',
    action: 'detail'
  },

  '/gene/:id': {
    controller: 'IndexController',
    action: 'gene'
  },

  '/searchResult': {
    controller: 'IndexController',
    action: 'search'
  },

  '/randompng': {
    controller: 'IndexController',
    action: 'randompng'
  },

  '/signUp': {
    controller: 'IndexController',
    action: 'signUp'
  },


  '/signIn': {
      controller: 'IndexController',
      action: 'signIn'
  },

  '/signOut': {
      controller: 'IndexController',
      action: 'signIn'
  },

  '/database': {
      controller: 'IndexController',
      action: 'database'
  },

  '/watch_case/:id': {
      controller: 'IndexController',
      action: 'watchCase'
  },

  '/searchCase': {
      controller: 'IndexController',
      action: 'searchCase'
  },

  '/request_view': {
      controller: 'IndexController',
      action: 'requestView'
  },

    '/my_request': {
        controller: 'IndexController',
        action: 'myRequest'
    },

    '/approve_request' : {
        controller: 'IndexController',
        action: 'approveRequest'
    },


    '/change_permission' : {
        controller: 'IndexController',
        action: 'changePermission'
    },

    '/upload' : {
        controller: 'IndexController',
        action: 'upload'
    },

    '/verify' : {
        controller: 'IndexController',
        action: 'verify'
    },

    '/new_case' : {
        controller: 'IndexController',
        action: 'newCase'
    },

    '/add_case' : {
        controller: 'IndexController',
        action: 'addCase'
    },

    '/case_picture/:id' : {
        controller: 'IndexController',
        action: 'casePicture'
    }

    //测试用，上线时删除
  /*'/test': {
      controller: 'IndexController',
      action: 'test'
  }*/

  /***************************************************************************
   *                                                                          *
   * Custom routes here...                                                    *
   *                                                                          *
   * If a request to a URL doesn't match any of the custom routes above, it   *
   * is matched against Sails route blueprints. See `config/blueprints.js`    *
   * for configuration options and examples.                                  *
   *                                                                          *
   ***************************************************************************/

};