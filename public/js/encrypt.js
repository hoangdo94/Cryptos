//Variables
var options = {};
var taskId;
var isInfoEncrypted = false;
//Events
$(window).load(function() {
    $('#encryptForm')[0].reset();
});
$('#input-algorithm').change(function(e) {
    $('#input-key').val('');
    $('#input-iv').val('');
});
$('#randomize-key').click(function(e) {
    e.preventDefault();
    var algo = $('#input-algorithm').val();
    $('#input-key').val(randomString(lengthStrict[algo].key));
});
$('#randomize-iv').click(function(e) {
    e.preventDefault();
    var algo = $('#input-algorithm').val();
    $('#input-iv').val(randomString(lengthStrict[algo].iv));
});
$('#encryptForm').submit(function(e) {
    e.preventDefault();
    $('#btn-checksum').prop('disabled', false);
    var file = document.getElementById('file-input').files[0];
    if (!file) {
        alert('Please choose file to Encrypt!');
        return;
    }
    options = {
        algorithm: $('#input-algorithm').val(),
        key: $('#input-key').val(),
        iv: $('#input-iv').val(),
        compress: $('#input-compress').prop('checked'),
    };
    if (!keyValidate(options)) return;
    $('#encryptForm').hide();
    $('#progress').show();
    uploadFile(file, function(percent) {
        $('#upload-progress .progress-bar').css('width', percent + '%').find('span').text(percent + '%');
    }, function(status, r) {
        if (status !== 'OK') {
            alert('Something gone wrong when uploading file');
            return;
        }
        options.originalname = r.originalname;
        options.path = r.path;
        $.post('/encrypt', options, function(data) {
            taskId = data.taskId;
            $('#ufc').html('Uploaded [<b>File Size: </b> ' + data.fileSize + ' bytes]');
            progressUpdate(data.taskId, 500, function(percent) {
                $('#encrypt-progress .progress-bar').css('width', percent + '%').find('span').text(percent + '%');
            }, function() {
                $('#efc').html('Encrypted [<b>TaskID: </b> ' + data.taskId + ']');
                $('#info-alg').text(options.algorithm);
                $('#info-key').text(options.key);
                $('#info-iv').text(options.iv);
                $('#info-compress').text(options.compress);
                $('#btn-download').attr('href', '/download/' + data.taskId);
                $('#result').show();
            });
        });
    });
});
$('#btn-checksum').click(function(e) {
    e.preventDefault();
    if (!taskId) return;
    $('#btn-checksum').prop('disabled', true);
    $('#btn-export').prop('disabled', true);
    $.get('/hash/' + taskId, function(data) {
        $('#btn-export').prop('disabled', false);
        options.md5 = data.hash;
        $('#info-body').append('- <b>MD5 Checksum:</b> ' + data.hash);
    });
});
$('#btn-export').click(function(e) {
    e.preventDefault();
    if (!taskId) return;
    var data = {
        algorithm: options.algorithm,
        key: isInfoEncrypted ? options.encryptedKey : options.key,
        iv: isInfoEncrypted ? options.encryptedIv : options.iv,
        compress: options.compress,
        md5: options.md5,
    };
    var blob = new Blob([JSON.stringify(data)], {
        type: "text/plain;charset=utf-8"
    });
    saveAs(blob, taskId + '.info');
});
$('#btn-generate-keypair').click(function(e) {
    e.preventDefault();
    $.get('/generate-keypair', function(data) {
        var privateBlob = new Blob([data.privateKey], {
            type: "application/x-x509-ca-cert"
        });
        var publicBlob = new Blob([data.publicKey], {
            type: "application/x-x509-ca-cert"
        });
        setTimeout(function() {
            saveAs(publicBlob, 'public.pem');
        }, 500)
        saveAs(privateBlob, 'private.pem');
    })
});
$('#btn-encrypt-info').click(function(e) {
    e.preventDefault();
    isInfoEncrypted = $('#input-encrypt-information').prop('checked');
    if (isInfoEncrypted) {
        var f = document.getElementById('file-privatekey').files[0];
        if (!f) {
            alert('Please select your Private key!');
            return;
        }
        readFile(f, function(pkey) {
            var data = {
                privateKey: pkey,
                key: options.key,
                iv: options.iv,
            };
            $.post('/encrypt-infomation', data, function(result) {
                options.encryptedKey = result.encryptedKey;
                options.encryptedIv = result.encryptedIv;
                $('#info-key').text('Encrypted');
                $('#info-iv').text('Encrypted');
            })
        });
    } else {
        $('#info-key').text(options.key);
        $('#info-iv').text(options.iv);
    }
});
$('#btn-reload').click(function(e) {
    e.preventDefault();
    $("form")[0].reset();
    window.location.reload();
});