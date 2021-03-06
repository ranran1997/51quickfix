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

(function (buster, define) {
	'use strict';

	var assert, refute, fail;

	assert = buster.assert;
	refute = buster.refute;
	fail = buster.assertions.fail;

	define('integration/aggregators/batching-test', function (require) {

		var integration, bus;

		integration = require('integration');
		require('integration/aggregators/batching');
		require('integration/channels/direct');

		buster.testCase('integration/aggregators/batching', {
			setUp: function () {
				bus = integration.bus();
			},
			tearDown: function () {
				bus.destroy();
			},

			'should batch every two messages, abandoning the last message': function (done) {
				var spy = this.spy(function (message) {
					assert.equals(['msg', 'msg'], message);
				});

				bus.directChannel('in', 'agg');
				bus.batchingAggregator('agg', { batch: 2, output: 'out' });
				bus.directChannel('out', bus.outboundAdapter(spy));

				bus.send('in', 'msg');
				assert.same(0, spy.callCount);
				bus.send('in', 'msg');
				assert.same(1, spy.callCount);
				bus.send('in', 'msg');
				assert.same(1, spy.callCount);
				bus.send('in', 'msg');
				assert.same(2, spy.callCount);
				bus.send('in', 'lost in the ether');

				setTimeout(function () {
					assert.same(2, spy.callCount);

					done();
				}, 10);
			},

			'should batch every two messages or 10ms': function (done) {
				var spy = this.spy(function (message) {
					message.forEach(function (msg) {
						assert.same('msg', msg);
					});
				});

				bus.directChannel('in', 'agg');
				bus.batchingAggregator('agg', { batch: 2, timeout: 10, output: 'out' });
				bus.directChannel('out', bus.outboundAdapter(spy));

				bus.send('in', 'msg');
				assert.same(0, spy.callCount);
				bus.send('in', 'msg');
				assert.same(1, spy.callCount);
				bus.send('in', 'msg');
				assert.same(1, spy.callCount);

				assert.same(1, spy.callCount);

				setTimeout(function () {
					assert.same(2, spy.callCount);

					assert.same(2, spy.getCall(0).args[0].length);
					assert.same(1, spy.getCall(1).args[0].length);

					done();
				}, 10);
			},
			'should batch every 10ms regardless of buffer size': function (done) {
				var spy = this.spy(function (message) {
					message.forEach(function (msg) {
						assert.same('msg', msg);
					});
				});

				bus.directChannel('in', 'agg');
				bus.batchingAggregator('agg', { timeout: 10, output: 'out' });
				bus.directChannel('out', bus.outboundAdapter(spy));

				bus.send('in', 'msg');
				bus.send('in', 'msg');
				bus.send('in', 'msg');
				bus.send('in', 'msg');
				bus.send('in', 'msg');

				assert.same(0, spy.callCount);

				setTimeout(function () {
					assert.same(1, spy.callCount);
				}, 50);

				setTimeout(function () {
					assert.same(1, spy.callCount);

					bus.send('in', 'msg');
					bus.send('in', 'msg');
					bus.send('in', 'msg');
				}, 100);

				setTimeout(function () {
					assert.same(2, spy.callCount);

					assert.same(5, spy.getCall(0).args[0].length);
					assert.same(3, spy.getCall(1).args[0].length);

					done();
				}, 150);
			},
			'should assert a valid configuration for an aggregator': function () {
				bus.batchingAggregator({ batch: 10, timeout: 10 });
				bus.batchingAggregator('agg1', { batch: 10, timeout: 10 });
				bus.batchingAggregator('agg2', { timeout: 10 });
				bus.batchingAggregator('agg3', { batch: 10 });
				bus.batchingAggregator('agg4', { batch: 0, timeout: 10 });
				bus.batchingAggregator('agg5', { batch: 10, timeout: 0 });

				try {
					bus.batchingAggregator('agg6', {});
					fail('Exception expected');
				}
				catch (e) {
					assert(e);
				}

				try {
					bus.batchingAggregator('agg7', { timeout: 0 });
					fail('Exception expected');
				}
				catch (e) {
					assert(e);
				}

				try {
					bus.batchingAggregator('agg8', { batch: 0 });
					fail('Exception expected');
				}
				catch (e) {
					assert(e);
				}

				try {
					bus.batchingAggregator('agg9', { timeout: 0, batch: 0 });
					fail('Exception expected');
				}
				catch (e) {
					assert(e);
				}
			}
		});

	});

}(
	this.buster || require('buster'),
	typeof define === 'function' && define.amd ? define : function (id, factory) {
		var packageName = id.split(/[\/\-]/)[0], pathToRoot = id.replace(/[^\/]+/g, '..');
		pathToRoot = pathToRoot.length > 2 ? pathToRoot.substr(3) : pathToRoot;
		factory(function (moduleId) {
			return require(moduleId.indexOf(packageName) === 0 ? pathToRoot + moduleId.substr(packageName.length) : moduleId);
		});
	}
	// Boilerplate for AMD and Node
));
