var page = require('webpage').create();
var args = require('system').args.slice(1);
var fs = require('fs');

var START_URL = 'https://my.yota.ru/selfcare/login',
    TIMEOUT = 30 * 1000,
    WAITFOR_INTERVAL = 250;

var showHelp = function () {
    var msg = 'Usage: phantomjs yota.js credentials.json command\n' +
        'Available commands:\n' +
        '\tinfo\t\t- show information about current tariff\n' +
        '\tlist\t\t- show list of all available tariffs\n' +
        '\tset speed\t- change tariff to specified speed';
    console.log(msg);
    phantom.exit(1);
};

// Get credentials from file
var file = args.shift();
if (!file) {
    showHelp();
}
var creds = JSON.parse(fs.read(file));

var login = creds.login,
    password = creds.password;

var command = args.shift();

if (!login || !password) {
    console.log('Login or password aren\'t specified in ' + file);
    phantom.exit(1);
}

function waitFor(testFx, onReady) {
    var start = new Date().getTime();
    var interval = setInterval(function () {
        if (new Date().getTime() - start >= TIMEOUT) {
            console.log("'waitFor()' timeout");
            phantom.exit(1);
        }
        if (testFx()) {
            onReady();
            clearInterval(interval);
        }
    }, WAITFOR_INTERVAL);
}

var getCurrentTariff = function (page) {
    return page.evaluate(function () {
        var result = '',
            $form = $('.tariff-choice-form'),
            productId = $form.find('input[name="product"]').val(),
            offerCode = $form.find('input[name="offerCode"]').val(),
            steps = window.sliderData[productId].steps;
        for (var i = 0; i < steps.length; i++) {
            if (steps[i].code == offerCode) {
                result = steps[i].name + '(остаток ' + steps[i].remainNumber + ' ' + steps[i].remainString + ')';
                break;
            }
        }
        return result;
    });
};

var getAllTariffs = function (page) {
    return page.evaluate(function () {
        var variants = [],
            $form = $('.tariff-choice-form'),
            productId = $form.find('input[name="product"]').val(),
            offerCode = $form.find('input[name="offerCode"]').val(),
            steps = window.sliderData[productId].steps;

        $.each(steps, function (i, s) {
            variants.push(
                (/max/.test(s.speedNumber) ? 'max : ' : s.speedNumber + ' : ') + (s.name || s.description) + ' (остаток ' + s.remainNumber + ' ' + s.remainString + ')' + (s.code === offerCode ? ' * текущий тариф' : ''));
        });
        return variants;
    });
};

var changeTariff = function (page, speed) {
    return page.evaluate(function (speed) {
        var $form = $('.tariff-choice-form')
            productId = $form.find('input[name="product"]').val(),
            steps = sliderData[productId].steps,
            currentOfferCode = $form.find('input[name="offerCode"]').val(),
            offerCode = null,
            isDisablingAutoprolong = false;

        $.each(steps, function (i, s) {
            if (
                s.speedNumber === speed ||
                (speed === 'max' && s.speedNumber.indexOf('max') !== -1)
            ) {
                offerCode = s.code;
                isDisablingAutoprolong = s.isDisablingAutoprolong;
            }
        });

        if (offerCode && currentOfferCode !== offerCode) {
            $form.find('[name="offerCode"]').val(offerCode);
            $form.submit();
        }
        return offerCode;
    }, speed);
};

var commandsHandlers = {

    info: function (page, onSuccess, onFail) {
        var curTariff = getCurrentTariff(page);
        console.log(curTariff);
        onSuccess();
    },

    list: function (page, onSuccess, onFail) {
        var tariffs = getAllTariffs(page);
        for (var i = 0; i < tariffs.length; ++i) {
            console.log(tariffs[i]);
        }
        onSuccess();
    },

    set: function (page, onSuccess, onFail) {
        var speed = args.shift(),
            newOfferCode;
        if (!speed) onFail();
        newOfferCode = changeTariff(page, speed);
        waitFor(
            function () {
                return page.evaluate(function (newOfferCode) {
                    return $('input[name="offerCode"]').val() === newOfferCode;
                }, newOfferCode)
            },
            function () {
                console.log('Changed!! New offers code is ' + newOfferCode);
                onSuccess();
            }
        );
    }

};

page.open(START_URL, function (status) {
    if (status !== 'success') {
        console.log('Unable to access network');
        phantom.exit(1);
    }

    // SignIn
    page.evaluate(function (login, password) {
        $(":text[name=IDToken1]").val(login);
        $(":password[name=IDToken3]").val(password);
        $("#doSubmitLoginForm").click();
    }, login, password);

    waitFor(
        function () {
            return page.evaluate(function () {
                return window.$ && $(".tariff-choice-form").is(":visible");
            });
        },
        function () {
            if (!commandsHandlers.hasOwnProperty(command)) {
                showHelp();
                phantom.exit(1);
            }
            var onSuccess = function () {
                phantom.exit();
            };
            var onFail = function () {
                phantom.exit(1);
            };
            commandsHandlers[command](page, onSuccess, onFail);
        }
    );
});

