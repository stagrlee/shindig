/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */


/**
 * @fileoverview This represents the service layer that talks to OSAPI
 * endpoints. All RPC requests should go into this class.
 */


/**
 * @param {Object=} opt_config Configuration JSON.
 * @constructor
 */
shindig.container.Service = function(opt_config) {
  var config = opt_config || {};

  /**
   * @type {string}
   */
  this.apiHost_ = String(shindig.container.util.getSafeJsonValue(config,
     shindig.container.ServiceConfig.API_HOST, window.__API_HOST));
  
  /**
   * @type {string}
   */
  this.apiPath_ = String(shindig.container.util.getSafeJsonValue(config,
      shindig.container.ServiceConfig.API_PATH, '/api/rpc/cs'));
  
  /**
   * @type {boolean}
   */
  this.sameDomain_ = Boolean(shindig.container.util.getSafeJsonValue(config,
      shindig.container.ServiceConfig.SAME_DOMAIN, false));

  /**
   * Map of gadget URLs to cached gadgetInfo response.
   * @type {Object}
   */
  this.cachedMetadatas_ = {};

  /**
   * Map of gadget URLs to cached tokenInfo response.
   * @type {Object}
   */
  this.cachedTokens_ = {};

  this.initializeOsapi_(); 

  this.onConstructed(config);
};


/**
 * Callback that occurs after instantiation/construction of this. Override to
 * provide your specific functionalities.
 * @param {Object=} opt_config. Configuration JSON.
 */
shindig.container.Service.prototype.onConstructed = function(opt_config) {};


/**
 * Do an immediate fetch of gadgets metadata for gadgets in request.ids, for
 * container request.container, with its results mutated by
 * request.sameDomain and request.aspDomain. The appropriate optional
 * callback opt_callback will be called, after a response is received.
 * @param {Object} request JSON object representing the request.
 * @param {function(Object)=} opt_callback function to call upon data receive.
 */
shindig.container.Service.prototype.getGadgetMetadata = function(
    request, opt_callback) {
  var callback = opt_callback || function() {};
  var self = this;
  osapi.gadgets.metadata.get(request).execute(function(response) {
    if (response.error) {
      // Hides internal server error.
      callback({
          error : 'Failed to retrieve gadget metadata.',
          errorCode : 'NOLOAD'
      });
    } else {
      for (var id in response) {
        var gadgetInfo = response[id];
        self.processSameDomain_(gadgetInfo);
        self.cachedMetadatas_[id] = gadgetInfo;
      }
      callback(response);
    }
  });
};


/**
 * @param {Object} request JSON object representing the request.
 * @param {function(Object)=} opt_callback function to call upon data receive.
 */
shindig.container.Service.prototype.getGadgetToken = function(
    request, opt_callback) {
  var callback = opt_callback || function() {};
  var self = this;
  osapi.gadgets.token.get(request).execute(function(response) {
    if (response.error) {
      // Hides internal server error.
      callback({
          error : 'Failed to retrieve gadget token.',
          errorCode : 'NOLOAD'
      });
    } else {
      for (var id in response) {
        self.cachedTokens_[id] = response[id];
      }
      callback(response);
    }
  });
};


/**
 * @param {string} url gadget URL to use as key to get cached metadata.
 * @return {string} the gadgetInfo referenced by this URL.
 */
shindig.container.Service.prototype.getCachedGadgetMetadata = function(url) {
  return this.cachedMetadatas_[url];
};


/**
 * @param {string} url gadget URL to use as key to get cached token.
 * @return {string} the tokenInfo referenced by this URL.
 */
shindig.container.Service.prototype.getCachedGadgetToken = function(url) {
  return this.cachedTokens_[url];
};


/**
 * @param {Object} gadgetInfo
 * @private
 */
shindig.container.Service.prototype.processSameDomain_ = function(gadgetInfo) {
  if (this.sameDomain_ && gadgetInfo['sameDomain']) {
    var views = gadgetInfo['views'] || {};
    for (var view in views) {
      views[view]['iframeHost'] = this.apiHost_;
    }
  }
};


/**
 * Initialize OSAPI endpoint methods/interfaces.
 * @private
 */
shindig.container.Service.prototype.initializeOsapi_ = function() {
  var endPoint = this.apiHost_ + this.apiPath_;
  
  var osapiServicesConfig = {};
  osapiServicesConfig['gadgets.rpc'] = [ 'container.listMethods' ];
  osapiServicesConfig[endPoint] = [
    'gadgets.metadata.get',
    'gadgets.token.get'
  ];

  gadgets.config.init({
    'osapi': { 'endPoints': [ endPoint ] },
    'osapi.services': osapiServicesConfig 
  });
};


// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------


/**
 * Enumeration of configuration keys for this service. This is specified in
 * JSON to provide extensible configuration.
 * @enum {string}
 */
shindig.container.ServiceConfig = {};
// Host to fetch gadget information, via XHR. 
shindig.container.ServiceConfig.API_HOST = 'apiHost';
// Path to fetch gadget information, via XHR. 
shindig.container.ServiceConfig.API_PATH = 'apiPath';
// Toggle to render gadgets in the same domain. 
shindig.container.ServiceConfig.SAME_DOMAIN = 'sameDomain';
