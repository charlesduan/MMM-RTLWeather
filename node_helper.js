/*
 * node_helper.js
 *
 * Module: MMM-RTLWeather
 */

var NodeHelper = require("node_helper");
const fs = require("fs");
const util = require('util');
var rtl_file = process.env.HOME + "/.rtl_temp";

module.exports = NodeHelper.create({
    start: function() {
        var self = this;
        setInterval(function() { self.updateTempData(); }, 3 * 60 * 1000);
    },

    updateTempData: function() {
        var self = this;
        fs.readFile(rtl_file, function(err, weatherData) {
            if (err) {
                self.weatherData = {
                    time: new Date().toISOString(),
                    error: "Could not read file"
                };
            } else {
                try {
                    self.weatherData = JSON.parse(weatherData);
                } catch (err2) {
                    self.weatherData = {
                        time: new Date().toISOString(),
                        error: "Could not read data"
                    };
                }
            }
            self.signalUpdate();
        });
    },

    signalUpdate: function() {
        if (!this.weatherData) { return; }
        this.sendSocketNotification("RTL_WEATHER_UPDATE", this.weatherData);
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "RTL_START") {
            if (this.weatherData) {
                this.signalUpdate();
            } else {
                this.updateTempData();
            }
        }
    },
});
