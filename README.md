# yota-script

Small [PhantomJS](http://phantomjs.org/download.html)-based application for [Yota.ru](http://yota.ru) personal cabinet.

## Usage

You need to download and install PhantomJS for your platform.

Then you can issue some commands:

`phantomjs yota.js credentials.json command [parameter]`

Where credentials.json must be in following format:

    {
        "login": "login@example.com",
        "password": "password"
    }

Or using bash-script:

`./yota command [parameter]`

## Available commands:

`info` - show current active tariff and remaining days.

`list` - output list of all available tariffs, which are the parameters for `set` command.

`set speed` - change tariff, where `speed` parameter is required and must be one of `list` command results.


## Samples

`phantomjs yota.js credentials.json set 5.0`

`./yota set max`

## Limitations && problems

Sometimes script have some timing issues. You can enable debug mode for PhantomJS with `--debug=yes`.
