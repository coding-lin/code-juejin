// setting
window._CCSettings = {
  platform: "web-mobile",
  groupList: ["default", "feet", "frogBodys", "UI"],
  collisionMatrix: [
    [true, true, true],
    [true, false, false],
    [true, false, false],
    [false, false, false, false],
  ],
  hasResourcesBundle: true,
  hasStartSceneBundle: false,
  remoteBundles: [],
  subpackages: [],
  launchScene: "db://assets/startup.fire",
  orientation: "",
  jsList: [],
};

// loader
!(function () {
  const loadedScripts = {};
  const REGEX = /^\w+:\/\/.*/;
  const downloader = cc.assetManager.downloader;

  function base64toBlob(base64, type) {
    var bstr = atob(base64, type),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {
      type: type,
    });
  }

  function base64toArray(base64) {
    var bstr = atob(base64),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return u8arr;
  }

  function arrayBufferHandler(url, options, callback, img) {
    var img = new Image();

    function loadCallback() {
      img.removeEventListener("load", loadCallback);
      img.removeEventListener("error", errorCallback);

      callback(null, img);
    }

    function errorCallback() {
      img.removeEventListener("load", loadCallback);
      img.removeEventListener("error", errorCallback);

      callback(new Error("Load image (" + url + ") failed"));
    }

    img.addEventListener("load", loadCallback);
    img.addEventListener("error", errorCallback);
    img.src = `data:image/${cc.path.extname(url).substring(1)};base64,${
      window.resMap[url]
    }`;
  }

  function downloadText(url, options, onComplete) {
    let data = window.resMap[url];
    onComplete(null, data);
  }

  function downloadArrayBuffer(url, options, onComplete) {
    let str = window.resMap[url];
    let data = base64toArray(str);
    onComplete(null, data);
  }

  function downloadBlobHandler(url, options, onComplete) {
    let data = window.resMap[url];
    onComplete(
      null,
      base64toBlob(data, `image/${cc.path.extname(url).substring(1)}`)
    );
  }

  function downloadWebAudio(url, options, onComplete) {
    var context = new (window.AudioContext || window.webkitAudioContext)();

    var data = window.resMap[url];
    data = base64toArray(data);

    context["decodeAudioData"](
      data.buffer,
      function (buffer) {
        onComplete(null, buffer);
      },
      function (e) {
        onComplete(e, null);
      }
    );
  }

  function loadScript(url) {
    let source = window.resMap[url];
    var d = document,
      s = document.createElement("script");
    s.setAttribute("type", "text/javascript");
    s.text = source;
    d.body.appendChild(s);
  }

  function downloadJson(url, options, onComplete) {
    let data = window.resMap[url];
    data = JSON.parse(data);
    onComplete(null, data);
  }

  function downloadBundleHandler(nameOrUrl, options, onComplete) {
    let bundleName = cc.path.basename(nameOrUrl);
    var version =
      options.version || cc.assetManager.downloader.bundleVers[bundleName];
    let suffix = version ? version + "." : "";
    let url = `assets/${bundleName}`;

    let js = `assets/${bundleName}/index.${suffix}js`;
    if (!loadedScripts[js]) {
      loadScript(js);
      loadedScripts[js] = true;
    }

    options.__cacheBundleRoot__ = bundleName;
    var config = `${url}/config.${suffix}json`;
    downloadJson(config, options, function (err, data) {
      if (err) {
        onComplete && onComplete(err);
        return;
      }
      data.base = url + "/";
      onComplete && onComplete(null, data);
    });
  }

  function getFontFamily(fontHandle) {
    var ttfIndex = fontHandle.lastIndexOf(".ttf");
    if (ttfIndex === -1) {
      ttfIndex = fontHandle.lastIndexOf(".tmp");
    }
    if (ttfIndex === -1) return fontHandle;

    var slashPos = fontHandle.lastIndexOf("/");
    var fontFamilyName;
    if (slashPos === -1) {
      fontFamilyName = fontHandle.substring(0, ttfIndex) + "_LABEL";
    } else {
      fontFamilyName = fontHandle.substring(slashPos + 1, ttfIndex) + "_LABEL";
    }
    return fontFamilyName;
  }

  function downloadFont(url, options, onComplete) {
    let fontFamilyName = getFontFamily(url);
    let data =
      'url(data:application/x-font-woff;charset=utf-8;base64,PASTE-BASE64-HERE) format("woff")';
    data = data.replace("PASTE-BASE64-HERE", window.resMap[url]);

    let fontFace = new FontFace(fontFamilyName, data);
    document.fonts.add(fontFace);

    fontFace.load();
    fontFace.loaded.then(
      function () {
        onComplete(null, fontFamilyName);
      },
      function () {
        cc.warnID(4933, fontFamilyName);
        onComplete(null, fontFamilyName);
      }
    );
  }

  function downloadVideo(url, options, onComplete) {
    onComplete(null);
  }

  cc.assetManager.downloader.register("bundle", downloadBundleHandler);

  cc.assetManager.downloader.register(".png", arrayBufferHandler);
  cc.assetManager.downloader.register(".jpg", arrayBufferHandler);
  cc.assetManager.downloader.register(".jpeg", arrayBufferHandler);
  cc.assetManager.downloader.register(".gif", downloadBlobHandler);

  cc.assetManager.downloader.register(".ttf", downloadFont);
  cc.assetManager.downloader.register(".plist", downloadText);
  cc.assetManager.downloader.register(".json", downloadJson);
  cc.assetManager.downloader.register(".bin", downloadArrayBuffer);

  cc.assetManager.downloader.register(".asset", downloadText);
  cc.assetManager.downloader.register(".mat", downloadText);

  cc.assetManager.downloader.register(".mp3", downloadWebAudio);
  cc.assetManager.downloader.register(".ogg", downloadWebAudio);
  cc.assetManager.downloader.register(".wav", downloadWebAudio);

  cc.assetManager.downloader.register(".mp4", downloadVideo);
})();

// boot
window.boot = function () {
  var settings = window._CCSettings;
  window._CCSettings = undefined;
  var onProgress = null;

  var RESOURCES = cc.AssetManager.BuiltinBundleName.RESOURCES;
  var INTERNAL = cc.AssetManager.BuiltinBundleName.INTERNAL;
  var MAIN = cc.AssetManager.BuiltinBundleName.MAIN;
  function setLoadingDisplay() {
    // Loading splash scene
    var splash = document.getElementById("splash");
    var progressBar = splash.querySelector(".progress-bar span");
    onProgress = function (finish, total) {
      var percent = (100 * finish) / total;
      if (progressBar) {
        progressBar.style.width = percent.toFixed(2) + "%";
      }
    };
    splash.style.display = "block";
    progressBar.style.width = "0%";

    cc.director.once(cc.Director.EVENT_AFTER_SCENE_LAUNCH, function () {
      splash.style.display = "none";
    });
  }

  var onStart = function () {
    cc.view.enableRetina(true);
    cc.view.resizeWithBrowserSize(true);

    if (cc.sys.isBrowser) {
      setLoadingDisplay();
    }

    if (cc.sys.isMobile) {
      if (settings.orientation === "landscape") {
        cc.view.setOrientation(cc.macro.ORIENTATION_LANDSCAPE);
      } else if (settings.orientation === "portrait") {
        cc.view.setOrientation(cc.macro.ORIENTATION_PORTRAIT);
      }
      cc.view.enableAutoFullScreen(
        [
          cc.sys.BROWSER_TYPE_BAIDU,
          cc.sys.BROWSER_TYPE_BAIDU_APP,
          cc.sys.BROWSER_TYPE_WECHAT,
          cc.sys.BROWSER_TYPE_MOBILE_QQ,
          cc.sys.BROWSER_TYPE_MIUI,
          cc.sys.BROWSER_TYPE_HUAWEI,
          cc.sys.BROWSER_TYPE_UC,
        ].indexOf(cc.sys.browserType) < 0
      );
    }

    // Limit downloading max concurrent task to 2,
    // more tasks simultaneously may cause performance draw back on some android system / browsers.
    // You can adjust the number based on your own test result, you have to set it before any loading process to take effect.
    if (cc.sys.isBrowser && cc.sys.os === cc.sys.OS_ANDROID) {
      cc.assetManager.downloader.maxConcurrency = 2;
      cc.assetManager.downloader.maxRequestsPerFrame = 2;
    }

    var launchScene = settings.launchScene;
    var bundle = cc.assetManager.bundles.find(function (b) {
      return b.getSceneInfo(launchScene);
    });

    bundle.loadScene(launchScene, null, onProgress, function (err, scene) {
      if (!err) {
        cc.director.runSceneImmediate(scene);
        if (cc.sys.isBrowser) {
          // show canvas
          var canvas = document.getElementById("GameCanvas");
          canvas.style.visibility = "";
          var div = document.getElementById("GameDiv");
          if (div) {
            div.style.backgroundImage = "";
          }
          console.log("Success to load scene: " + launchScene);
        }
      }
    });
  };

  var option = {
    id: "GameCanvas",
    debugMode: settings.debug
      ? cc.debug.DebugMode.INFO
      : cc.debug.DebugMode.ERROR,
    showFPS: settings.debug,
    frameRate: 60,
    groupList: settings.groupList,
    collisionMatrix: settings.collisionMatrix,
  };

  cc.assetManager.init({
    bundleVers: settings.bundleVers,
    remoteBundles: settings.remoteBundles,
    server: settings.server,
  });

  var bundleRoot = [INTERNAL];
  settings.hasResourcesBundle && bundleRoot.push(RESOURCES);

  var count = 0;
  function cb(err) {
    if (err) return console.error(err.message, err.stack);
    count++;
    if (count === bundleRoot.length + 1) {
      cc.assetManager.loadBundle(MAIN, function (err) {
        if (!err) cc.game.run(option, onStart);
      });
    }
  }

  cc.assetManager.loadScript(
    settings.jsList.map(function (x) {
      return "src/" + x;
    }),
    cb
  );

  for (var i = 0; i < bundleRoot.length; i++) {
    cc.assetManager.loadBundle(bundleRoot[i], cb);
  }
};

window.addEventListener("resize", () => {
  console.log(555);
});

if (window.jsb) {
  var isRuntime = typeof loadRuntime === "function";
  if (isRuntime) {
    require("src/settings.js");
    require("src/cocos2d-runtime.js");
    if (CC_PHYSICS_BUILTIN || CC_PHYSICS_CANNON) {
      require("src/physics.js");
    }
    require("jsb-adapter/engine/index.js");
  } else {
    require("src/settings.js");
    require("src/cocos2d-jsb.js");
    if (CC_PHYSICS_BUILTIN || CC_PHYSICS_CANNON) {
      require("src/physics.js");
    }
    require("jsb-adapter/jsb-engine.js");
  }

  cc.macro.CLEANUP_IMAGE_CACHE = true;
  window.boot();
}

window.boot();
