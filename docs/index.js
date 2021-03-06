var vm;
var tweakList;
var userDetails;
var cache;

$(document).ready(function () {

    var TweakList = Vue.extend({
        template: "#tweaklist-template",
        data: function () {
            return {
                data: {
                    searchTerm: "",
                    iOSVersionIndex: 0,
                    categories: [],
                    devices: [],
                    iOSVersions: [],
                    packageCache: {},
                    packages: []
                }
            };
        },
        mounted: function () {
            var c = this;
            async.auto({
                devices: function (callback) {
                    $.ajax({
                        url: "devices.json",
                        dataType: 'json',
                        success: function (data) {
                            callback(null, data.devices);
                        },
                        error: function (err) {
                            callback(err);
                        }
                    });
                },
                iOSVersions: function (callback) {
                    $.ajax({
                        url: "iOSVersions.json",
                        dataType: 'json',
                        success: function (data) {
                            callback(null, data.iOSVersions);
                        },
                        error: function (err) {
                            callback(err);
                        }
                    });
                },
                index: ['devices', 'iOSVersions', function (results, callback) {
                    //detect ios version from useragent
                    var v = iOSVersion();
                    var iOSVersionIndex = 0;
                    var foundVersion = false;
                    if (v) {
                        results.iOSVersions.forEach(function (vers, idx) {
                            if (v == vers) {
                                iOSVersionIndex = idx;
                                foundVersion = true
                            }
                        });
                    }
                    if (!foundVersion) {
                        iOSVersionIndex = (results.iOSVersions.length - 1);
                    }
                    callback(null, iOSVersionIndex);
                }]
            }, function (err, results) {
                if (err) {
                    return console.error(err);
                }
                c.data.iOSVersions = results.iOSVersions;
                c.data.devices = results.devices;
                c.data.iOSVersionIndex = results.index;
                c.fetch();
            });
        },
        computed: {
            filteredPackages: function () {

                var data = this.data;
                var iOSVersion = data.iOSVersions[data.iOSVersionIndex];
                var searchTerm = data.searchTerm.toLowerCase();
                

                
                var filteredPackageList = data.packages.filter(function (package) {
                    if (searchTerm == "") {
                        return true;
                    }
                    return (
                        package.name.toLowerCase().indexOf(searchTerm) > -1 ||
                        package.shortDescription.toLowerCase().indexOf(searchTerm) > -1
                    );
                });

                //reformat the object for display purposes
                filteredPackageList.forEach(function (package) {
                    package.versions.forEach(function (item) {

                        item.current = (item.iOSVersion == iOSVersion &&
                            item.tweakVersion == package.latest);
                        item.classObject = {
                            "label-success": (item.outcome.calculatedStatus == "Working"),
                            "label-danger": (item.outcome.calculatedStatus == "Not working"),
                            "label-warning": (item.outcome.calculatedStatus == "Likely working"),
                            "label-default": (item.outcome.calculatedStatus == "Unknown")
                        };

                    });
                });
                return filteredPackageList;
            }
        },
        methods: {
            getDeviceName: function (deviceId) {
                var devices = this.data.devices;
                var found = devices.find(function (device) {
                    return device.deviceId == deviceId;
                });
                return found ? found.deviceName : "Unknown device";
            },
            selectOSFilter: function (event, index) {
                this.data.iOSVersionIndex = index;
            },
            fetch: function () {
                var c = this;
                if (c.data.iOSVersions.length == 0) {
                    return;
                }
                var selectediOS = c.data.iOSVersions[c.data.iOSVersionIndex];

                if (c.data.packageCache.hasOwnProperty(selectediOS)) {
                    c.data.packages = c.data.packageCache[selectediOS].slice();

                    c.data.categories = c.data.packages.map(function(package) {
                        return package.category;
                    }).filter(function (value, index, self) {
                        return self.indexOf(value) === index;
                    });

                } else {
                    $.getJSON("json/iOS/" + selectediOS + ".json", function (data) {
                        c.data.packageCache[selectediOS] = data.packages.slice();
                        c.fetch();
                    });
                }
            }
        }
    });


    vm = new Vue({
        el: "#app",
        data: {},
        components: {
            tweaklist: TweakList
        }
    });

});


function iOSVersion() {
    if (window.MSStream) {
        // There is some iOS in Windows Phone...
        // https://msdn.microsoft.com/en-us/library/hh869301(v=vs.85).aspx
        return false;
    }
    var match = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/),
        version;

    if (match !== undefined && match !== null) {
        version = [
            parseInt(match[1], 10),
            parseInt(match[2], 10),
            parseInt(match[3] || 0, 10)
        ];
        return parseFloat(version.join('.'));
    }

    return false;
}