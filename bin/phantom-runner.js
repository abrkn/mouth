// https://gist.github.com/2316021
/*global phantom:true, console:true, WebPage:true, Date:true*/
(function () {
    var url, timeout, page, defer;
    
    if (phantom.args.length < 1) {
        console.log("Usage: [this script] URL [timeout]");
        phantom.exit();
    }
    
    url = phantom.args[0];
    timeout = phantom.args[1] || 5 * 1000;
    
    page = new WebPage();
    
    defer = function (test, scrapper) {
        var start, condition, func, interval, time, testStart;
        start = new Date().getTime();
        testStart = new Date().getTime();
        condition = false;
        func = function () {
            if (new Date().getTime() - start < timeout && !condition) {
                condition = test();
            } else {
                if (!condition) {
                    console.log("Timeout passed before the tests finished.");
                    phantom.exit();
                } else {
                    clearInterval(interval);
                    time = Math.round((new Date().getTime() - testStart) / 100) / 10;
                    console.log("Finished in " + time + "s.\n");
                    scrapper();
                    phantom.exit();
                }
            }
        };
        interval = setInterval(func, 100);
    };

    page.onConsoleMessage = function (msg) { console.log(msg); };

    page.onError = function (msg, trace) {
        console.error(msg);

        trace.forEach(function(item) {
            console.error('  ', item.file, ':', item.line);
        });

        phantom.exit();
    };

    page.open(url, function (status) {
        var test, scrapper;
        if (status !== "success") {
            console.log("Failed to load the page. Check the url");
            phantom.exit();
        }

        test = function () {
            return page.evaluate(function () {
                return window.testsCompleted;
            });
        };

        scrapper = function () {
            var all, list, i, len;

            all = page.evaluate(function () {
                var specs, i, len, results = [];
                specs = document.querySelectorAll(".test");
                for (i = 0, len = specs.length; i < len; i += 1) {
                    results.push(specs[i].getAttribute("class").search(/fail/) === -1);
                }
                return results;
            });
            
            // Outputs a '.' or 'F' for each test
            console.log(all.reduce(function (str, a) {
                return str += (a) ? "." : "F";
            }, ""));

            list = page.evaluate(function () {
                var result = [];

                var findTests = function(name, parent) {
                    $(parent).find('>ul>li.test.fail').each(function(k, v) {
                        result.push({
                            name: name + ': ' + $(v).find('h2').text(),
                            error: $(v).find('.error').text()
                        });
                    });

                    $(parent).find('>ul>li.suite').each(function(k, v) {
                        var cname = (name ? name + ': ' : '') + $(v).find('>h1').text();
                        findTests(cname, v);
                    });
                };

                findTests(null, $('#mocha')[0]);
                return result;
            });

            // If the list of failures is not empty output the failure messages
            console.log("");
            if (list.length) {
                for (i = 0, len = list.length; i < len; i += 1) {
                    console.log(list[i].name + "\n" + list[i].error + "\n");
                }
            }
        };
        defer(test, scrapper);
    });
    
}());