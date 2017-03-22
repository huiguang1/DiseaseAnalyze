/**
 * Created by shxx_ on 2017/3/22.
 */
/**
 * Admin/Searches.js
 */
module.exports = {
    tableName: 'Web_searches',
    autoCreatedAt: false,
    autoUpdatedAt: false,
    attributes: {
        user: {
            type: 'string',
            unique: true,
            primaryKey: true,
            columnName: 'user'
        },
        search0: {
            type: 'string',
            columnName: 'search0'
        },
        search1: {
            type: 'string',
            columnName: 'search1'
        },
        search2: {
            type: 'string',
            columnName: 'search2'
        },
        search3: {
            type: 'string',
            columnName: 'search3'
        },
        search4: {
            type: 'string',
            columnName: 'search4'
        },
        search5: {
            type: 'string',
            columnName: 'search5'
        },
        search6: {
            type: 'string',
            columnName: 'search6'
        },
        search7: {
            type: 'string',
            columnName: 'search7'
        },
        search8: {
            type: 'string',
            columnName: 'search8'
        },
        search9: {
            type: 'string',
            columnName: 'search9'
        },
        iterator: {
            type: 'integer',
            columnName: 'iterator'
        }
    }
};