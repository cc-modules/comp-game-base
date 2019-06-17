const env = require('util-env');
const strings = require('util-strings');
require('util-loaderp')

const methods = {
  $debug: env.debug,
  $log: env.log,
  /**
   * Instantiate a cc.Node from a Prefab
   * @param {String} dir directory name in assets/resources/<dir>
   * @param {String} name prefab name in <dir>
   */
  addPrefabToScene (dir, name = dir, compName = name) {
    return this.instantiatePrefab(dir, name).then(node => {
      const scene = cc.director.getScene();
      const canvas = scene.children[0];
      node.x = canvas.width / 2;
      node.y = canvas.height / 2;
      node.active = false;
      const comp = node.addComponent(name);
      scene.addChild(node);
      return comp;
    });
  },
  /**
   * Instantiate a cc.Node from a Prefab
   * @param {String} dir directory name in assets/resources/<dir>
   * @param {String} name prefab name in <dir>
   */
  instantiatePrefab (dir, name = dir) {
    return new Promise((resolve, reject) => {
      cc.loader.loadRes(`${dir}/${name}`, function (err, prefab) {
        if (err) {
          reject(err);
        } else {
          const node = cc.instantiate(prefab);
          resolve(node);
        }
      });
    });
  },
  saveAudio (audioName, audioUrl, node = this) {
    if (!node) return;
    node['audio' + strings.capitalize(audioName)] = audioUrl;
  },
  playAudio (audioName, node = this) {
    const url = node['audio' + strings.capitalize(audioName)];
    if (!url) return -1;
    return cc.audioEngine.play(url);
  },
  playAudioPromise (audioName, node = this) {
    const id = this.playAudio(audioName, node);
    if (id < 0) return Promise.reject(`${audioName} not found!`);
    return new Promise(res => {
      cc.audioEngine.setFinishCallback(id, res);
    });
  },
  runActionPromise (node, ...actions) {
    return this.runActionPromiseWithArg(node, null, ...actions);
  },
  runActionPromiseWithArg (node, args, ...actions) {
    return new Promise(res => {
      actions.push(cc.callFunc(_ => res(args)));
      const act = cc.sequence(actions);
      node.runAction(act);
    });
  },
  urlOf (filename, dir = this.directory) {
    checkHostAndDir(this);
    return `${this.resourceHost}/${dir}/${filename}`;
  },
  setResourceHost (host) {
    this.resourceHost = host;
    return this;
  },
  setDirectory (dir) {
    this.directory = dir;
    return this;
  },
  loadConfig (filename = 'config.json') {
    checkHostAndDir(this);
    return cc.loaderp.load(this.urlOf(filename)).then(data => {
      return this._config = data;
    });
  },
  loadImage (filename, asSpriteFrame = true) {
    checkHostAndDir(this);
    const promise = cc.loaderp.load(this.urlOf(filename));
    if (asSpriteFrame) return promise.then(createSpriteFrame);
    return promise;
  },
  loadImages (filenames, asSpriteFrame = true) {
    checkHostAndDir(this);
    const promise = cc.loaderp.loadAll(filenames);
    if (asSpriteFrame) return promise.then(textures => {
      return textures.map(createSpriteFrame);
    });
    return promise;
  },
  loadAudio (filename) {
    checkHostAndDir(this);
    return cc.loaderp.load(this.urlOf(filename));
  },
  loadAudios (filenames) {
    checkHostAndDir(this);
    return cc.loaderp.loadAll(filenames);
  }
}

function createSpriteFrame (tex) {
  const frame = new cc.SpriteFrame();
  frame.setTexture(tex)
  return frame;
}

function checkHostAndDir (comp) {
  if (!comp.resourceHost) {
    throw new Error('Please set resource host property of GameBase!');
  }
  if (!comp.directory) {
    throw new Error('Please set directory first!');
  }
}
/**
 * Base Game class
 */
cc.Class({
  extends: cc.Component,
  properties: {
    collisionSystem: false,
    debugCollision: false,
    resourceHost: {
      default: '',
      tooltip: 'CDN Path without trailing slash, e.g.: https://files.host.com/games'
    }
  },
  onLoad: function () {
    this._env = env;
    this._query = strings.parseQuery(location.search);

    const collisionManager = cc.director.getCollisionManager()
    collisionManager.enabled = this.collisionSystem;
    collisionManager.enabledDebugDraw = this.debugCollision;

    this.init();
  },
  init () {
    const comps = this.node._components;
    for (let i in comps) {
      let comp = comps[i];
      if (!comp || comp.sceneScript !== true) {
        continue;
      }
      // inject methods into components whose scenceScript property is true
      Object.assign(comp, methods);
      comp.resourceHost = this.resourceHost;
      comp.query = this._query;
      comp.env = this._env;
    }
  }
});
if (typeof Object.assign != 'function') {
  // Must be writable: true, enumerable: false, configurable: true
  Object.defineProperty(Object, "assign", {
    value: function assign(target, varArgs) { // .length of function is 2
      'use strict';
      if (target == null) { // TypeError if undefined or null
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource != null) { // Skip over if undefined or null
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true
  });
}