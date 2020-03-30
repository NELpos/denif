'use strict';

const mode = process.env.NODE_ENV;

// default


switch (mode) {
    case 'dev':
        var config = {
            discord : {
                'token' : "NjkyMjYxMTg3MzAzMjQzNzk2.XnxbGA.wvIBaGSReRPJYL2kZKM37-Vcmbs"
            }
        }
        break;
    case 'prod':

        break;
}

module.exports.config = config;