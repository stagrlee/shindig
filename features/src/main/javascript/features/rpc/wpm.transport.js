/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

gadgets.rpctx = gadgets.rpctx || {};

/**
 * Transport for browsers that support native messaging (various implementations
 * of the HTML5 postMessage method). Officially defined at
 * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html.
 *
 * postMessage is a native implementation of XDC. A page registers that
 * it would like to receive messages by listening the the "message" event
 * on the window (document in DPM) object. In turn, another page can
 * raise that event by calling window.postMessage (document.postMessage
 * in DPM) with a string representing the message and a string
 * indicating on which domain the receiving page must be to receive
 * the message. The target page will then have its "message" event raised
 * if the domain matches and can, in turn, check the origin of the message
 * and process the data contained within.
 *
 *   wpm: postMessage on the window object.
 *      - Internet Explorer 8+
 *      - Safari 4+
 *      - Chrome 2+
 *      - Webkit nightlies
 *      - Firefox 3+
 *      - Opera 9+
 */
if (!gadgets.rpctx.wpm) {  // make lib resilient to double-inclusion

gadgets.rpctx.wpm = function() {
  var ready;

  return {
    getCode: function() {
      return 'wpm';
    },

    isParentVerifiable: function() {
      return true;
    },

    init: function(processFn, readyFn) {
      ready = readyFn;
      var onmessage = function(packet) {
        // TODO validate packet.domain for security reasons
        processFn(gadgets.json.parse(packet.data));
      };
 
      // Set up native postMessage handler.
      gadgets.util.attachBrowserEvent(window, 'message', onmessage, false);

      ready('..', true);  // Immediately ready to send to parent.
      return true;
    },

    setup: function(receiverId, token) {
      // If we're a gadget, send an ACK message to indicate to container
      // that we're ready to receive messages.
      if (receiverId === '..') {
        gadgets.rpc.call(receiverId, gadgets.rpc.ACK);
      }
      return true;
    },

    call: function(targetId, from, rpc) {
      var targetWin = gadgets.rpc._getTargetWin(targetId);
      // targetOrigin = canonicalized relay URL
      var origRelay = gadgets.rpc.getRelayUrl(targetId) ||
                      gadgets.util.getUrlParameters()["parent"];
      var origin = gadgets.rpc.getOrigin(origRelay);
      if (origin) {
        targetWin.postMessage(gadgets.json.stringify(rpc), origin);
      } else {
        gadgets.error("No relay set (used as window.postMessage targetOrigin)" +
            ", cannot send cross-domain message");
      }
      return true;
    }
  };
}();

} // !end of double-inclusion guard
