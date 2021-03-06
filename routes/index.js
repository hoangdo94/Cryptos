var express = require('express');
var router = express.Router();
var crypt = require('../controllers/crypt');
var db = require('../controllers/db');
var multer = require('multer');
var upload = multer({
    dest: 'uploads/'
});
var mkdirp = require('mkdirp');

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index');
});

router.get('/encrypt', function(req, res, next) {
    res.render('encrypt');
});

router.get('/decrypt', function(req, res, next) {
    res.render('decrypt');
});

router.get('/tools', function(req, res, next) {
    res.render('tools');
});

router.post('/upload', upload.single('inputFile'), function(req, res, next) {
    res.json({
        originalname: req.file.originalname,
        destination: req.file.destination,
        filename: req.file.filename,
        path: req.file.path,
    });
});

router.post('/encrypt', function(req, res, next) {
    var outputDir = './outputs/' + Date.now();
    var options = {
        input: './' + req.body.path,
        output: outputDir + '/en_' + req.body.originalname,
        algorithm: req.body.algorithm,
        key: req.body.key,
        iv: req.body.iv,
        compress: req.body.compress,
    };
    // console.log(options);
    mkdirp(outputDir, function(err) {
        if (err) return res.send(null);
        crypt.encrypt(options, function(taskId, fileSize) {
            return res.json({
                taskId: taskId,
                fileSize: fileSize,
            });
        });
    });
});

router.post('/decrypt', function(req, res, next) {
    var outputDir = './outputs/' + Date.now();
    var options = {
        input: './' + req.body.path,
        output: outputDir + '/de_' + req.body.originalname,
        algorithm: req.body.algorithm,
        key: req.body.key,
        iv: req.body.iv,
        compress: req.body.compress,
    };
    // console.log(options);
    mkdirp(outputDir, function(err) {
        if (err) return res.send(null);
        crypt.decrypt(options, function(taskId, fileSize) {
            return res.json({
                taskId: taskId,
                fileSize: fileSize,
            });
        });
    });
});

router.get('/progress/:id', function(req, res, next) {
    db.tmp.findOne({
        _id: req.params.id
    }, function(err, doc) {
        if (doc) {
            if (doc.status && doc.status == 'error') {
                return res.json({
                    progress: 'error'
                });
            }
            return res.json({
                progress: doc.progress
            });
        }
        return res.json(err);
    })
});

router.get('/information/:id', function(req, res, next) {
    db.per.findOne({
        _id: req.params.id
    }, function(err, doc) {
        if (doc) {
            delete(doc.input);
            delete(doc.output);
            return res.json(doc);
        }
        return res.json(err);
    })
});

router.get('/hash/:id', function(req, res, next) {
    var alg = req.query.algorithm || 'md5';
    db.per.findOne({
        _id: req.params.id
    }, function(err, doc) {
        if (doc) {
            var path = (doc.task == 'encrypt') ? doc.input : doc.output;
            crypt.generateHash(path, alg, function(err, hash) {
                if (err) {
                    return res.json({
                        error: err
                    });
                }
                return res.json({
                    algorithm: alg,
                    hash: hash
                });
            })
        } else {
            return res.json({
                error: 'Not found!'
            });
        }
    })
});

router.get('/download/:id', function(req, res, next) {
    db.per.findOne({
        _id: req.params.id
    }, function(err, doc) {
        if (doc) {
            return res.download(doc.output);
        }
        return res.json({
            error: 'Not found!'
        });
    })
});

router.get('/analytic', function(req, res, next) {
    var selector = {
        algorithm: req.query.algorithm || 'des',
        task: req.query.task || 'encrypt',
        compress: req.query.compress || 'true',
    }
    db.per.find(selector).sort({
        size: 1
    }).exec(function(err, docs) {
        console.log(docs);
        res.json(docs.map(function(doc) {
            return {
                x: doc.size,
                y: doc.duration,
            }
        }));
    })
});

router.get('/generate-keypair', function(req, res, next) {
    var size = parseInt(req.query.size) || 512;
    console.log('key size', size);
    crypt.generateKeypair(size, function(keys) {
        res.json(keys);
    });
});

router.post('/encrypt-infomation', function(req, res, next) {
    crypt.rsaEncrypt(req.body, function(encrypted) {
        res.json(encrypted);
    });
});
router.post('/decrypt-infomation', function(req, res, next) {
    crypt.rsaDecrypt(req.body, function(decrypted) {
        res.json(decrypted);
    });
});

module.exports = router;