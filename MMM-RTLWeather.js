//
// MMM-RTLWeather.js
//
// Reads a file that contains the weather output from rtl_433.
//

Module.register("MMM-RTLWeather", {
    defaults: {
        units: config.units,
    },

    start: function() {
        var self = this;
        Log.info("Starting module: " + this.name);
        this.weatherData = null;

        this.sendSocketNotification("RTL_START");

        // Update the "last modified" data once a minute
        setInterval(function() { self.updateDom(); }, 60 * 1000);
    },

    socketNotificationReceived: function(notification, payload) {
        switch (notification) {
        case "RTL_WEATHER_UPDATE":
            this.weatherData = payload;
            this.sendWeatherNotifications();
            this.updateDom();
            break;
        }
    },

    sendWeatherNotifications: function() {
        if (this.weatherData) {
            if (this.weatherData.temperature_F) {
                this.sendNotification("INDOOR_TEMPERATURE",
                        this.weatherData.temperature_F);
            }
            if (this.weatherData.temperature_C) {
                this.sendNotification("INDOOR_TEMPERATURE",
                        this.weatherData.temperature_C);
            }
            if (this.weatherData.humidity) {
                this.sendNotification("INDOOR_HUMIDITY",
                        this.weatherData.humidity);
            }
        }
    },

    getDelayTime: function() {
        var then = Date.parse(this.weatherData.time);
        if (isNaN(then)) { return "time unknown"; }
        var delay = Date.now() - then;
        if (delay < 60000) { return "just recently"; }
        delay /= 60000;
        if (delay < 1.5) { return "1 minute ago"; }
        if (delay < 60) { return Math.round(delay) + " minutes ago"; }
        delay /= 60;
        if (delay < 1.5) { return "1 hour ago"; }
        if (delay < 24) { return Math.round(delay) + " hours ago"; }
        delay /= 24;
        if (delay < 1.5) { return "1 day ago"; }
        return Math.round(delay) + " days ago";
    },

    getTemperature: function() {
        if (!this.weatherData) { return "???"; }
        var temp;
        if (this.weatherData.temperature_F) {
            temp = this.weatherData.temperature_F;
            if (this.config.units === "metric") {
                temp = (temp - 32) * 5 / 9;
            }
        } else if (this.weatherData.temperature_C) {
            temp = this.weatherData.temperature_C;
            if (this.config.units === "imperial") {
                temp = temp * 9 / 5 + 32;
            }
        }
        return parseFloat(temp).toFixed(1);
    },

    getDewpoint: function() {
        if (!this.weatherData) { return null; }
        var temp = this.getTemperature() * 1;
        if (this.config.units === "imperial") { temp = (temp - 32) * 5 / 9; }
        var humidity = this.weatherData.humidity;
        var b = 17.67;
        var c = 257.14;
        var gamma = Math.log(humidity / 100) + (b * temp) / (c + temp);
        var dewpoint = c * gamma / (b - gamma);
        if (this.config.units === "imperial") {
            dewpoint = dewpoint * 9 / 5 + 32;
        }
        return Math.round(dewpoint);
    },

    getDewpointStyle: function(dewpoint) {
        if (this.config.units === "metric") {
            dewpoint = dewpoint * 9 / 5 + 32;
        }
        if (dewpoint < 30) {
            return "fa-icicles";
        } else if (dewpoint < 55) {
            return "fa-smile-beam";
        } else if (dewpoint < 60) {
            return "fa-smile";
        } else if (dewpoint < 65) {
            return "fa-meh";
        } else if (dewpoint < 70) {
            return "fa-tint";
        } else {
            return "fa-water";
        }
    },

    getDom: function() {
        var wrapper = document.createElement("div");
        if (this.weatherData) {
            if (this.weatherData.error) {
                wrapper.innerHTML = "Error: " + this.weatherData.error;
            } else {
                this.getDomForData(wrapper);
            }
        } else {
            wrapper.innerHTML = "Data not loaded yet";
        }
        return wrapper;
    },

    getDomForData: function(wrapper) {
        var tempInfo = document.createElement("div");
        tempInfo.className = "large light";
        var temperature = document.createElement("span");
        temperature.className = "bright";
        temperature.innerHTML = " " + this.getTemperature() + "&deg;";
        tempInfo.appendChild(temperature);
        wrapper.appendChild(tempInfo);

        var dewpoint = this.getDewpoint();
        if (dewpoint) {
            tempInfo = document.createElement("div");
            tempInfo.className = "normal medium";
            tempInfo.innerHTML = "Dew point " + dewpoint + "&deg;" +
                " <span class=\"fa fa-fw " +
                this.getDewpointStyle(dewpoint) + "\" />";
            wrapper.appendChild(tempInfo);
        }

        var deviceStatus = document.createElement("div");
        deviceStatus.className = "dimmed light xsmall";

        var delayTime = this.getDelayTime();
        deviceStatus.innerHTML = "Updated " + delayTime;
        if (this.weatherData.battery_low != 0) {
            deviceStatus.innerHTML += "<br/>SENSOR BATTERY LOW";
        }
        wrapper.appendChild(deviceStatus);
    },
});
