// Copyright 2020 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Flags: --allow-natives-syntax --super-ic --opt --runtime-call-stats
// Flags: --no-always-opt --no-stress-opt --turboprop
// Flags: --turboprop-dynamic-map-checks

load("test/mjsunit/runtime-callstats-helpers.js");

%GetAndResetRuntimeCallStats();

// This file contains tests which require --dynamic-map-chekcs.

(function TestMinimorphicPropertyAccess() {
  class A {}
  A.prototype.bar = "wrong value: A.prototype.bar";

  class B extends A {};
  B.prototype.bar = "correct value";

  class C extends B {
    foo(should_bailout) {
      const r = super.bar;
      const did_bailout = (
          %GetOptimizationStatus(C.prototype.foo) &
          V8OptimizationStatus.kTopmostFrameIsTurboFanned) == 0;
      assertEquals(should_bailout, did_bailout);
      return r;
    }
  }
  C.prototype.bar = "wrong value: C.prototype.bar";
  %PrepareFunctionForOptimization(C.prototype.foo);

  let o = new C();
  o.bar = "wrong value: o.bar";

  // Fill in the feedback.
  let r = o.foo(true);
  assertEquals("correct value", r);
  %OptimizeFunctionOnNextCall(C.prototype.foo);

  // Test the optimized function.
  r = o.foo(false);
  assertEquals("correct value", r);
})();

// Assert that the tests so far generated real optimized code and not just a
// bailout to Runtime_LoadFromSuper. TODO(marja, v8:9237): update this to track
// the builtin we'll use for bailout cases.
assertEquals(0, getRuntimeFunctionCallCount("LoadFromSuper"));

// Reset runtime stats so that we don't get extra printout.
%GetAndResetRuntimeCallStats();
