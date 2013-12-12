var rasterizeHTML = require('../src/rasterizeHTML'),
    testHelper = require('./testHelper');

describe("The rendering process", function () {
    describe("on document to SVG conversion", function () {
        it("should return a SVG with embeded HTML", function () {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "Test content";

            var svgCode = rasterizeHTML.getSvgForDocument(doc, 123, 456);

            expect(svgCode).toMatch(new RegExp(
                '<svg xmlns="http://www.w3.org/2000/svg" width="123" height="456">' +
                    '<foreignObject width="100%" height="100%">' +
                        '<html xmlns="http://www.w3.org/1999/xhtml">' +
                            '<head>' +
                                '<title(/>|></title>)' +
                            '</head>' +
                            '<body>' +
                                "Test content" +
                            '</body>' +
                        '</html>' +
                    '</foreignObject>' +
                '</svg>'
            ));
        });

        it("should return a SVG with embedded image", function () {
            var doc = document.implementation.createHTMLDocument(""),
                canonicalXML;
            doc.body.innerHTML = '<img src="data:image/png;base64,sOmeFAKeBasE64="/>';

            var svgCode = rasterizeHTML.getSvgForDocument(doc, 123, 456);

            expect(svgCode).not.toBeNull();
            canonicalXML = svgCode.replace(/ +\/>/, '/>');
            expect(canonicalXML).toMatch(new RegExp(
                '<svg xmlns="http://www.w3.org/2000/svg" width="123" height="456">' +
                    '<foreignObject width="100%" height="100%">' +
                        '<html xmlns="http://www.w3.org/1999/xhtml">' +
                            '<head>' +
                                '<title(/>|></title>)' +
                            '</head>' +
                            '<body>' +
                                '<img src="data:image/png;base64,sOmeFAKeBasE64="/>' +
                            '</body>' +
                        '</html>' +
                    '</foreignObject>' +
                '</svg>'
            ));
        });

        it("should return a SVG with the given size", function () {
            var doc = document.implementation.createHTMLDocument("");
            doc.body.innerHTML = "content";

            var svgCode = rasterizeHTML.getSvgForDocument(doc, 123, 987);

            expect(svgCode).toMatch(new RegExp(
                '<svg xmlns="http://www.w3.org/2000/svg" width="123" height="987">' +
                    '<foreignObject width="100%" height="100%">' +
                        '<html xmlns="http://www.w3.org/1999/xhtml">' +
                            '<head>' +
                                '<title(/>|></title>)' +
                            '</head>' +
                            '<body>' +
                                "content" +
                            '</body>' +
                        '</html>' +
                    '</foreignObject>' +
                '</svg>'
            ));
        });

        describe("workAroundWebkitBugIgnoringTheFirstRuleInCSS", function () {
            var originalUserAgent, myUserAgent;

            beforeEach(function () {
                originalUserAgent = window.navigator.userAgent;
                // Mock userAgent, does not work under Safari
                navigator.__defineGetter__('userAgent', function () {
                    return myUserAgent;
                });
            });

            afterEach(function () {
                myUserAgent = originalUserAgent;
            });

            it("should add a workaround for Webkit to account for first CSS rules being ignored", function () {
                var doc = document.implementation.createHTMLDocument(""),
                    svgCode;

                myUserAgent = "WebKit";
                testHelper.addStyleToDocument(doc, 'span { background-image: url("data:image/png;base64,soMEfAkebASE64="); }');

                svgCode = rasterizeHTML.getSvgForDocument(doc, 123, 987);

                expect(svgCode).toMatch(/<style type="text\/css">\s*span \{\}/);
            });

            ifNotInWebkitIt("should not add a workaround outside of WebKit", function () {
                var doc = document.implementation.createHTMLDocument(""),
                    svgCode;

                myUserAgent = "Something else";
                testHelper.addStyleToDocument(doc, 'span { background-image: url("data:image/png;base64,soMEfAkebASE64="); }');

                svgCode = rasterizeHTML.getSvgForDocument(doc, 123, 987);

                expect(svgCode).not.toMatch(/span \{\}/);
            });

        });
    });

    describe("on SVG rendering", function () {
        beforeEach(function () {
            this.addMatchers(imagediff.jasmine);
        });

        ifNotInWebkitIt("should render the SVG", function () {
            var image = null,
                referenceImg = $('<img src="' + jasmine.getFixtures().fixturesPath + 'rednblue.png" alt="test image"/>'),
                twoColorSvg = (
                    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
                        '<foreignObject width="100%" height="100%">' +
                            '<html xmlns="http://www.w3.org/1999/xhtml">' +
                                '<head>' +
                                    '<style type="text/css">body { padding: 0; margin: 0}</style>' +
                                '</head>' +
                                '<body>' +
                                    '<div style="background-color: #ff7700; height: 50px"></div>' +
                                    '<div style="background-color: #1000ff; height: 50px"></div>' +
                                '</body>' +
                            '</html>' +
                        '</foreignObject>' +
                    '</svg>'
                );

            rasterizeHTML.renderSvg(twoColorSvg, null, function (the_image) {
                image = the_image;
            });

            waitsFor(function () {
                return image != null;
            }, "rasterizeHTML.renderSvg", 2000);

            runs(function () {
                // This fails in Chrome & Safari, possibly due to a bug with same origin policy stuff
                try {
                    expect(image).toImageDiffEqual(referenceImg.get(0));
                } catch (err) {
                    expect(err.message).toBeNull();
                }
            });
        });

        ifNotInWebkitIt("should render an SVG with inline image", function () {
            var image = null,
                referenceImg = $('<img src="' + jasmine.getFixtures().fixturesPath + 'rednblue.png" alt="test image"/>'),
                twoColorSvg = (
                    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
                        '<foreignObject width="100%" height="100%">' +
                            '<html xmlns="http://www.w3.org/1999/xhtml">' +
                                '<head>' +
                                    '<style type="text/css">body { padding: 0; margin: 0}</style>' +
                                '</head>' +
                                '<body>' +
                                    '<img id="image" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAABAUlEQVR4nO3RMQ3AABDEsINQtoX/hdEMHrxHyu7d0bG/AzAkzZAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMidmzOzoMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMiTEkxpAYQ2IMifkA6bsjwS/Y5YIAAAAASUVORK5CYII=" alt="test image"/>' +
                                '</body>' +
                            '</html>' +
                        '</foreignObject>' +
                    '</svg>'
                );

            rasterizeHTML.renderSvg(twoColorSvg, null, function (the_image) {
                image = the_image;
            });

            waitsFor(function () {
                return image != null;
            }, "rasterizeHTML.renderSvg", 2000);

            runs(function () {
                // This fails in Chrome & Safari, possibly due to a bug with same origin policy stuff
                try {
                    expect(image).toImageDiffEqual(referenceImg.get(0));
                } catch (err) {
                    expect(err.message).toBeNull();
                }
            });
        });

        it("should return an error when the SVG cannot be rendered", function () {
            var imageSpy = {},
                successCallback = jasmine.createSpy("successCallback"),
                errorCallback = jasmine.createSpy("errorCallback");

            // We need to mock, as only Chrome & Safari seem to throw errors on a faulty SVG
            spyOn(window, "Image").andReturn(imageSpy);

            rasterizeHTML.renderSvg("svg", null, successCallback, errorCallback);

            imageSpy.onerror();

            expect(errorCallback).toHaveBeenCalled();
            expect(successCallback).not.toHaveBeenCalled(); // Quite possibly depends on the underlying JS implementation to actually work :{
        });

        it("should return an image without event listeners attached", function () {
            var image = null,
                anSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';

            rasterizeHTML.renderSvg(anSvg, null, function (the_image) {
                image = the_image;
            });

            waitsFor(function () {
                return image != null;
            }, "rasterizeHTML.renderSvg", 2000);

            runs(function () {
                expect(image.onerror).toBeNull();
                expect(image.onload).toBeNull();
            });
        });
    });

    describe("drawDocumentImage", function () {
        var doc = "doc",
            canvas, callback, errorCallback;

        beforeEach(function () {
            spyOn(rasterizeHTML.util, 'fakeHover');
            spyOn(rasterizeHTML.util, 'fakeActive');
            spyOn(rasterizeHTML.util, 'calculateDocumentContentSize');
            spyOn(rasterizeHTML, 'getSvgForDocument');
            spyOn(rasterizeHTML, 'renderSvg');

            canvas = document.createElement("canvas");
            canvas.width = 123;
            canvas.height = 456;

            callback = jasmine.createSpy("drawCallback");
            errorCallback = jasmine.createSpy("drawCallback");
        });

        it("should draw the image", function () {
            var svg = "the svg",
                image = "the image";

            rasterizeHTML.util.calculateDocumentContentSize.andCallFake(function (doc, w, h, callback) {
                callback(47, 11);
            });
            rasterizeHTML.getSvgForDocument.andReturn(svg);
            rasterizeHTML.renderSvg.andCallFake(function(svg, canvas, callback) {
                callback(image);
            });

            rasterizeHTML.drawDocumentImage(doc, canvas, {}, callback, errorCallback);

            expect(rasterizeHTML.util.calculateDocumentContentSize).toHaveBeenCalledWith(doc, jasmine.any(Number), jasmine.any(Number), jasmine.any(Function));
            expect(rasterizeHTML.getSvgForDocument).toHaveBeenCalledWith(doc, 47, 11);
            expect(rasterizeHTML.renderSvg).toHaveBeenCalledWith(svg, canvas, jasmine.any(Function), jasmine.any(Function));

            expect(callback).toHaveBeenCalledWith(image);
        });

        it("should report an error when constructing the SVG image", function () {
            rasterizeHTML.util.calculateDocumentContentSize.andCallFake(function (doc, w, h, callback) {
                callback();
            });
            rasterizeHTML.renderSvg.andCallFake(function(svg, canvas, successCallback, errorCallback) {
                errorCallback();
            });

            rasterizeHTML.drawDocumentImage(doc, canvas, {}, callback, errorCallback);

            expect(errorCallback).toHaveBeenCalled();
        });

        it("should use the canvas width and height as viewport size", function () {
            rasterizeHTML.drawDocumentImage(doc, canvas, {}, callback);

            expect(rasterizeHTML.util.calculateDocumentContentSize).toHaveBeenCalledWith(doc, 123, 456, jasmine.any(Function));
        });

        it("should make the canvas optional and apply default viewport width and height", function () {
            rasterizeHTML.drawDocumentImage(doc, null, {}, callback);

            expect(rasterizeHTML.util.calculateDocumentContentSize).toHaveBeenCalledWith(doc, 300, 200, jasmine.any(Function));
        });

        it("should take an optional width and height", function () {
            rasterizeHTML.drawDocumentImage(doc, canvas, {width: 42, height: 4711}, callback);

            expect(rasterizeHTML.util.calculateDocumentContentSize).toHaveBeenCalledWith(doc, 42, 4711, jasmine.any(Function));
        });

        it("should trigger hover effect", function () {
            rasterizeHTML.drawDocumentImage(doc, canvas, {hover: '.mySpan'}, callback);

            expect(rasterizeHTML.util.fakeHover).toHaveBeenCalledWith(doc, '.mySpan');
        });

        it("should not trigger hover effect by default", function () {
            rasterizeHTML.drawDocumentImage(doc, canvas, {}, callback);

            expect(rasterizeHTML.util.fakeHover).not.toHaveBeenCalled();
        });

        it("should trigger active effect", function () {
            rasterizeHTML.drawDocumentImage(doc, canvas, {active: '.mySpan'}, callback);

            expect(rasterizeHTML.util.fakeActive).toHaveBeenCalledWith(doc, '.mySpan');
        });

        it("should not trigger active effect by default", function () {
            rasterizeHTML.drawDocumentImage(doc, canvas, {}, callback);

            expect(rasterizeHTML.util.fakeActive).not.toHaveBeenCalled();
        });
    });

    describe("on drawing the image on the canvas", function () {
        it("should render the image and return true", function () {
            var image = "the_image",
                canvas = jasmine.createSpyObj("canvas", ["getContext"]),
                context = jasmine.createSpyObj("context", ["drawImage"]);

            canvas.getContext.andCallFake(function (howManyD) {
                if (howManyD === "2d") {
                    return context;
                }
            });

            var result = rasterizeHTML.drawImageOnCanvas(image, canvas, function () {});

            expect(result).toBeTruthy();
            expect(context.drawImage).toHaveBeenCalledWith(image, 0, 0);
        });

        it("should handle an error and return false", function () {
            var image = "the_image",
                canvas = jasmine.createSpyObj("canvas", ["getContext"]),
                context = jasmine.createSpyObj("context", ["drawImage"]);

            canvas.getContext.andReturn(context);
            context.drawImage.andThrow("error");

            var result = rasterizeHTML.drawImageOnCanvas(image, canvas, function () {}, function () {});

            expect(result).toBeFalsy();
        });
    });
});
