/**
 * Created by shxx_yhg on 2017/3/15.
 * caseUploader.js - 一个用来上传vcf、xls、txt、csv四种格式病例文件的jQuery插件
 * 对病例文件进行分块、压缩、断点续传
 *
 * 依赖：
 * xlsx.js - xlsx.core.min.js
 */


(function ( $ ) {
    $.fn.caseUploader = function(options) {
        $.extend($.fn.caseUploader.options, options);

        //构造元素
        var htmlStr = '';
        if (typeof options.caseInput == 'undefined'){
            htmlStr += '<input id="case-input" type="file" accept="text/plain, .xls, .xlsx, .csv, .vcf">';
        }
        options = $.fn.caseUploader.options;
        htmlStr += '<button id="cu-upload-button">上传</button>';
        htmlStr += '<button id="cu-pause-button">暂停</button>';
        htmlStr += '<div class="cu-info-div">';
        htmlStr += '<div id="cu-fileName-div"></div>';
        htmlStr += '<div id="cu-fileSize-div"></div>';
        htmlStr += '<div id="cu-fileLeft-div"></div>';
        htmlStr += '<div id="cu-speed-div"></div>';
        htmlStr += '<div id="cu-status-div"></div>';
        htmlStr += '</div>';
        this.html(htmlStr);

        //保存元素
        var status = $.fn.caseUploader.status;
        status.$input = $('#' + options.caseInput);
        status.$uploadButton = $('#cu-upload-button');
        status.$pauseButton = $('#cu-pause-button');
        status.$fileNameDiv = $('#cu-fileName-div');
        status.$fileSizeDiv = $('#cu-fileSize-div');
        status.$fileLeftDiv = $('#cu-fileLeft-div');
        status.$speedDiv = $('#cu-speed-div');
        status.$statusDiv = $('#cu-status-div');

        //注册按钮点击事件
        status.$uploadButton.click($.fn.caseUploader.upload);
        status.$pauseButton.click($.fn.caseUploader.pause);

        return this;
    };
    //可自定义的属性
    $.fn.caseUploader.options = {
        chunkSize: 5 * 1024 * 1024,//文件分块大小，单位: B
        maxSingleSize: 5 * 1024 * 1024,//对于小文件（xls/xlsx/txt/csv格式），设置最大允许大小
        maxBigSingleSize: 1024 * 1024 * 1024, //设置vcf格式文件的最大允许大小
        additionalData: '',//可以为文件添加自定义的信息
        caseInput: 'case-input',//本插件自带一个<input>元素，如果要使用自定的<input>元素，则将该字段替换为其他id即可
        url: 'upload',//上传文件的目标地址
    };
    //status用来维护运行时的一些状态
    $.fn.caseUploader.status = {
        LOG: '',
        log: function(str){
            this.LOG += new Date() + '   ###   ' + str + '\n';
        },
        fileIndex: 0,
        chunkPos: 0,
        uploading: false,
        pausing: false
    };
    $.fn.caseUploader.terminate = function(err){
        if (err && err != '') alert(err);
        var status = $.fn.caseUploader.status;
        status.log('Terminated');
        status.uploading = false;
        status.pausing = false;
        status.fileIndex = 0;
        status.chunkPos = 0;
        //TODO: 修改可视元素。
    };
    $.fn.caseUploader.uploadRecursively = function(){
        var status = $.fn.caseUploader.status;
        var options = $.fn.caseUploader.options;
        var file = status.files[status.fileIndex];
        if (status.chunkPos != 0){
            //继续对一个文件的分块上传
            status.reader.readAsText(file.slice(status.chunkPos, status.chunkPos += options.chunkSize));
        } else {
            //开始上传一个新的文件。根据文件大小，分为一次上传整个文件或分块上传。
            if (file.size <= options.maxSingleSize){
                status.reader.readAsBinaryString(file);
            } else {
                //分块上传vcf格式文件。
                status.reader.readAsBinaryString(file.slice(0, options.chunkSize));
            }
        }
    };
    $.fn.caseUploader.upload = function (e) {
        var status = $.fn.caseUploader.status;
        if (status.uploading){
            if (!confirm("目前正在上传中，您确认要重新开始吗？")){
                return;
            }
        }
        var options = $.fn.caseUploader.options;
        status.uploading = true;
        status.files = [];
        for (var i = 0;status.$input[0].files[i];i++){
            status.files[i] = status.$input[0].files[i];
        }
        status.files.sort(function(a,b) {
            return a.size > b.size;
        });
        //检查所有文件的扩展名和大小
        for (i = 0;i < status.files.length;i++){
            var file = status.files[i];
            var ext = file.name.substr(file.name.lastIndexOf('.'));
            file.ext = ext;
            switch(ext){
                case 'txt':
                case 'csv': case 'xls': case 'xlsx':
                    if (file.size > options.maxSingleSize){
                        return $.fn.caseUploader.terminate('抱歉，您要上传的文件“' + file.name + '”过大。\n' +
                            '该格式的文件允许最大大小为：'+options.maxSingleSize);
                    }
                    break;
                case 'vcf':
                    if (file.size > options.maxBigSingleSize){
                        return $.fn.caseUploader.terminate('抱歉，您要上传的文件“' + file.name + '”过大。\n' +
                            '该格式的文件允许最大大小为：'+options.maxBigSingleSize);
                    }
                    break;
                default:
                    return $.fn.caseUploader.terminate('抱歉，您要上传的文件“' + file.name + '”扩展名不符合要求。\n' +
                        '可接受的类型为：vcf、xls、xlsx、txt、csv。');
            }
        }
        if (typeof status.reader == 'undefined') {
            var reader = new FileReader();
            reader.onload = function () {
                var file = status.files[status.fileIndex];
                switch(file.ext){
                    //TODO: 进行格式检查
                    case 'txt':
                    case 'csv':
                    case 'xls': case 'xlsx':
                    case 'vcf':
                    default:
                        status.log('upload1');
                        return $.fn.caseUploader.terminate('未知错误。\n' + status.LOG);
                }
                var fData = new FormData();
                fData.append("name",file.name);
                fData.append("type",file.type);
                fData.append("data",$.fn.caseUploader.compress(reader.result));
                if (options.additionalData != ''){
                    fData.append("additionalData", options.additionalData);
                }

                $.ajax({
                    url: options.url,
                    type: 'POST',
                    data: fData,
                    processData: false,
                    contentType: false,
                    cache: false,
                    success: function (data) {
                        //TODO: 解析返回值
                        if (true){
                            //TODO: 下一文件或块
                        }else {
                            //TODO: 重传或终止
                        }
                    },
                    error: function (err){
                        alert('网络连接异常！\n'+err);
                    }
                });
            };
            status.reader = reader;
        }
        return $.fn.caseUploader.uploadRecursively();

        reader.onload = function(){
            alert('Load SUCCESS!! content: ' + reader.result);

            var fData = new FormData();
            fData.append("name",file.name);
            fData.append("size",file.size);
            fData.append("type",file.type);
            fData.append("blob",reader.result);


            $.ajax({
                url: options.url,
                type: 'POST',
                data: fData,
                processData: false,
                contentType: false,
                cache: false,
                success: function (data) {
                    alert(data);
                },
                error: function (err){
                    alert(err);
                }
            });
        };
        reader.readAsText(blob);

        status.uploading = false;//别忘了移动到回调函数里
    };
    $.fn.caseUploader.pause = function (e) {
        alert(0);
    };
    $.fun.caseUploader.compress = function (data) {
        //TODO: 压缩数据
        return data;
    };
} ( jQuery ));