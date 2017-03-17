/**
 * Created by shxx_yhg on 2017/3/15.
 * caseUploader.js - 一个用来上传vcf、xls、txt、csv四种格式病例文件的jQuery插件
 * 对病例文件进行分块、压缩、断点续传
 */

(function ( $ ) {
    $.fn.caseUploader = function(options) {
        this.html('');

        return this;
    };
    $.fn.caseUploader.options = {
        chunkSize: 5 * 1024 * 1024,
        additionalData: {}
    };
    $.fn.caseUploader.status = {
        chunkIndex: 0
    };
    $.fn.caseUploader.upload = function () {
        var file = 0;//TODO: get the file

        $.fn.caseUploader.file = file;

    }

} ( jQuery ));