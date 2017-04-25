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
        encoding: 'gbk',//接收文件的编码格式。目前只支持中英文
        callback: function (data) {} //回调函数，参数为上传完成后返回的信息
    };
    //status用来维护运行时的一些状态
    $.fn.caseUploader.status = {
        LOG: '',
        log: function(str){
            this.LOG += new Date() + '   ###   ' + str + '\n';
        },
        files: [],
        fileIndex: 0,
        chunkPos: 0,
        uploading: false,
        pausing: false,
        index: 0
    };
    $.fn.caseUploader.terminate = function(err){
        if (err && err != '') alert(err);
        var status = $.fn.caseUploader.status;
        status.log('Terminated');
        status.uploading = false;
        status.pausing = false;
        status.fileIndex = 0;
        status.chunkPos = 0;
        status.index = 0;
        //TODO: 修改可视元素。
    };
    $.fn.caseUploader.uploadRecursively = function(){
        var status = $.fn.caseUploader.status;
        var options = $.fn.caseUploader.options;
        var file = status.files[status.fileIndex];
        if (status.chunkPos != 0){
            //继续分块上传
            status.reader.readAsText(file.slice(status.chunkPos, status.chunkPos + options.chunkSize), options.encoding);
        } else {
            //开始上传一个新的文件。
            switch (file.ext){
                case 'txt': case 'csv':
                    status.reader.readAsText(file, options.encoding);
                    break;
                case 'xls': case 'xlsx':
                    status.reader.readAsBinaryString(file);
                    break;
                case 'vcf':
                    //分块上传vcf格式文件。
                    status.reader.readAsText(file.slice(0, options.chunkSize), options.encoding);
                    break;
            }
        }
    };
    $.fn.caseUploader.checkParsed = function(parsedData, file){
        if (parsedData['文件类型'] == undefined){
            $.fn.caseUploader.terminate('格式错误：文件“' + file.name +
                '”缺少字段“文件类型”。');
            return false;
        }
        switch(parsedData['文件类型']){
            case '染色体变异':
                if (parsedData['病患'] == undefined || parsedData['病患'] == ''){
                    $.fn.caseUploader.terminate('格式错误：文件“' + file.name +
                        '”中，字段“病患”缺失，请修改后重新上传。');
                    return false;
                }
                if (parsedData.data.length == 0 || parsedData['染色体;染色体臂;位置;类型'] == undefined){
                    $.fn.caseUploader.terminate('格式错误：文件“' + file.name +
                        '”中，缺少染色体变异数据。');
                    return false;
                }
                break;
            case '基因变异':
                if (parsedData['病患'] == undefined || parsedData['病患'] == ''){
                    $.fn.caseUploader.terminate('格式错误：文件“' + file.name +
                        '”中，字段“病患”缺失，请修改后重新上传。');
                    return false;
                }
                if (parsedData.data.length == 0 || parsedData['基因名'] == undefined){
                    $.fn.caseUploader.terminate('格式错误：文件“' + file.name +
                        '”中，缺少基因变异数据。');
                    return false;
                }
                break;
            default:
                $.fn.caseUploader.terminate('格式错误：文件“' + file.name +
                    '”中，“'+ parsedData['文件类型'] +'”不是有效的文件类型。');
                return false;
        }
        return true;
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
            reader.onload = function (e) {
                var fData = new FormData();
                var file = status.files[status.fileIndex];
                fData.append("name",file.name);
                if (options.additionalData != ''){
                    fData.append("additionalData", options.additionalData);
                }

                //病例文件解析、检查和封装
                var result = e.target.result;
                if (file.ext == 'vcf'){
                    var chunkSizeCount = 0;
                    if (status.chunkPos > 0){
                        //文件块处理
                        if (status.chunkPos + options.chunkSize >= file.size){
                            //最后一块
                            status.chunkPos = 0;
                            status.fileIndex++;
                            fData.append("type", 'tail');
                            fData.append("chunk", result);
                            fData.append("finish", status.fileIndex == status.files.length ? 'true' : 'false');
                        } else {
                            //中间块
                            status.chunkPos += result.lastIndexOf('\n') + 1;
                            fData.append("type", 'chunk');
                            fData.append("chunk", result.substr(0, result.lastIndexOf('\n')).trim());
                            fData.append("finish", 'false');
                        }
                    } else {
                        //元数据处理，此处假定元数据大小在单文件块大小以下
                        var metaData = {};
                        var lines = result.result.split('\n');
                        for (i = 0;i < lines.length;i++){
                            chunkSizeCount += lines[i].length + 1;
                            line = lines[i].trim();
                            if (line == '') continue;
                            if (line[0] != '#'){
                                return $.fn.caseUploader.terminate('VCF文件“'+ file.name + '”格式异常，' +
                                    '行数：'+(i+1)+'，请修改后重新上传。');
                            }
                            if (line[1] == '#'){
                                if (line.indexOf('=') == -1){
                                    return $.fn.caseUploader.terminate('VCF文件“'+ file.name + '”格式异常，' +
                                        '行数：'+(i+1)+'，请修改后重新上传。');
                                }
                                var lineKey = line.substr(2, line.indexOf('=') - 2);
                                var lineVal = line.substr(line.indexOf('=')+1, line.length);
                                if (lineKey.length == 0 || lineVal.length == 0){
                                    return $.fn.caseUploader.terminate('VCF文件“'+ file.name + '”格式异常，' +
                                        '行数：'+(i+1)+'，请修改后重新上传。');
                                }
                                if (metaData[lineKey] == undefined){
                                    metaData[lineKey] = [ lineVal ];
                                } else {
                                    metaData[lineKey].push(lineVal);
                                }
                            } else {
                                metaData['dataFields'] = line;
                                break;
                            }
                        }
                        fData.append("type",'head');
                        fData.append("metaData", metaData);
                        fData.append("finish", 'false');
                        //剩下的数据丢弃，等待下次传输
                        status.chunkPos = chunkSizeCount;
                    }
                } else {
                    var parsedData = {
                        data: []
                    };
                    switch (file.ext) {
                        case 'txt':
                            result.trim().split('\n').forEach(function (v, i) {
                                v = v.trim();
                                if (v == '')return;
                                var parsed = v.split(':');
                                if (parsed.length == 1){
                                    parsedData.data.push(parsed[0].split(';'));
                                } else {
                                    parsedData[parsed[0]] = parsed[1];
                                }
                            });
                            if (!$.fn.caseUploader.checkParsed(parsedData, file)) return;
                            break;
                        case 'xls': case 'xlsx':
                            //使用js-xlsx解析，转换为CSV格式文件
                            var worksheet = XLSX.read(result, {type: 'binary'});
                            result = XLSX.utils.sheet_to_csv(worksheet.Sheets[worksheet.SheetNames[0]]);
                        case 'csv':
                            var splitedResult = result.trim().split('\n');
                            var i;
                            var ifGene = false;
                            for (i = 0;i < splitedResult.length;i++){
                                splitedResult[i] = splitedResult[i].trim();
                                var line = splitedResult[i].split(',');
                                if (line[0] == '染色体') {
                                    parsedData['染色体;染色体臂;位置;类型'] = '';
                                    i++;
                                    break;
                                }
                                if (line[0] == '基因名'){
                                    ifGene = true;
                                    parsedData['基因名'] = '';
                                    i++;
                                    break;
                                }
                                parsedData[line[0]] = line[1];
                            }
                            for (;i < splitedResult.length;i++){
                                parsedData.data.push(splitedResult[i].split(',', ifGene ? 1 : 4));
                            }
                            if (!$.fn.caseUploader.checkParsed(parsedData, file)) return;
                            break;

                        default:
                            status.log('upload1');
                            return $.fn.caseUploader.terminate('未知错误。\n' + status.LOG);
                    }
                    status.fileIndex++;
                    fData.append("type",'file');
                    fData.append("parsedData",parsedData);
                    fData.append("finish", status.fileIndex == status.files.length ? 'true' : 'false');
                }
                fData.append("index", status.index);
                var tryAjax = function(errorCount) {
                    $.ajax({
                        url: options.url,
                        type: 'POST',
                        data: fData,
                        processData: false,
                        contentType: false,
                        cache: false,
                        timeout: 15000,
                        success: function (ret) {
                            //TODO: 解析返回值，更新可视元素
                            status.index++;
                            var stat;
                            switch (stat) {
                                case 'next':
                                    return $.fn.caseUploader.uploadRecursively();
                                case 'abort':
                                    return $.fn.caseUploader.terminate('服务器异常，上传终止。\n' +
                                        '请稍后再试。');
                                case 'finish':
                                    var data;
                                    return options.callback(data);
                            }
                        },
                        error: function (err) {
                            errorCount++;
                            if (errorCount >= 3) {
                                return $.fn.caseUploader.terminate('网络连接异常，上传终止。\n' +
                                    '请检查您的网络连接后再试。');
                            }
                            else {
                                return tryAjax(errorCount);
                            }
                        }
                    });
                };
                tryAjax(0);
            };
            status.reader = reader;
        }
        return $.fn.caseUploader.uploadRecursively();
    };
    $.fn.caseUploader.pause = function (e) {
        alert(0);
    };
    $.fun.caseUploader.compress = function (data) {
        //TODO: 压缩数据
        return data;
    };
} ( jQuery ));