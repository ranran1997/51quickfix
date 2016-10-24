/*
 * Copyright (c) 2012 VMware, Inc. All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

(function (define) {
	'use strict';

	var undef;

	/**
	 * Aggregate messages into batches as they are received.
	 *
	 * @author Scott Andrews
	 */
	define(function (require) {

		var integration = require('../integration');

		/**
		 * Aggregates messages into batches as they are received. Batches may
		 * be chunked either by an absolute size and/or a timeout since the
		 * first message was received for the chunk.  Either a batch size or
		 * timeout must be specified.
		 *
		 * @param {string} [name] the name to register the aggregator as
		 * @param {number} [opts.batch=0] absolute size of a chunk. If <=0,
		 *   batch size is not a factor
		 * @param {number} [opts.timeout=0] number of milliseconds since the
		 *   first message arrived to queue the chunk. If <=0, timeout is not a
		 *   factor
		 * @param {string|Channel} [opts.output] the channel to post the
		 *   aggregated messages to
		 * @param {string|Channel} [opts.input] the channel to receive message
		 *   from
		 * @param {string|Channel} [opts.error] channel to receive errors
		 * @returns the aggregator
		 * @throws on invalid configuration, batch size or timeout is required
		 */
		integration.prototype.batchingAggregator = integration.utils.optionalName(function batchingAggregator(name, opts) {
			var timeout, batch;

			batch = [];
			opts = opts || {};
			opts.batch = opts.batch || 0;
			opts.timeout = opts.timeout || 0;

			if (opts.batch <= 0 && opts.timeout <= 0) {
				throw new Error('Invalid configuration: batch size or timeout must be defined');
			}

			function releaseHelper(release) {
				release(batch);
				batch = [];
				clearTimeout(timeout);
				timeout = undef;
			}

			return this.aggregator(name, function (message, release) {
				batch.push(message.payload);
				if (opts.batch > 0 && batch.length >= opts.batch) {
					releaseHelper(release);
				}
				else if (!timeout && opts.timeout > 0) {
					timeout = setTimeout(function () {
						releaseHelper(release);
					}, opts.timeout);
				}
			}, opts);
		});

		return integration;

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));