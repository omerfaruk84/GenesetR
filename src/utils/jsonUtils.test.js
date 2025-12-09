/**
 * Simple test file for JSON utility functions
 * This can be run in the browser console to test the functions
 */

import { safeJsonParse, isValidJson } from './jsonUtils';

// Test with the correlation data format from the user's example
const testCorrelationData = `{
    "data": {
        "nodes": {
            "0": {
                "count": 1,
                "distance": 0,
                "parent": 80,
                "objects": [
                    "ZNF548"
                ],
                "features": [
                    -0.03,
                    0.01,
                    0.01,
                    0.04,
                    0.0,
                    0.02,
                    0.03,
                    1.0,
                    0.05,
                    0.04,
                    0.03,
                    0.02,
                    0.04,
                    -0.02,
                    0.0,
                    0.02,
                    0.02,
                    0.01,
                    0.02,
                    0.03,
                    0.02,
                    0.02,
                    -0.02,
                    0.04,
                    -0.0,
                    0.0,
                    -0.01,
                    -0.01,
                    0.01,
                    -0.04,
                    0.01,
                    0.05,
                    0.02,
                    -0.01,
                    0.02,
                    0.1,
                    0.06,
                    -0.0,
                    0.01,
                    0.0,
                    -0.0,
                    0.0,
                    0.02,
                    -0.02,
                    -0.02,
                    -0.0,
                    0.02,
                    0.0
                ]
            }
        },
        "feature_names": ["GENE1", "GENE2", "GENE3"]
    }
}`;

// Test cases
export const runTests = () => {
  console.log('=== Testing JSON Utils ===');
  
  // Test 1: Valid JSON string
  console.log('Test 1: Valid JSON string');
  const result1 = safeJsonParse(testCorrelationData, {
    defaultValue: null,
    throwOnError: false
  });
  console.log('Result:', result1);
  console.log('Has data:', !!result1?.data);
  console.log('Has nodes:', !!result1?.data?.nodes);
  console.log('Has feature_names:', !!result1?.data?.feature_names);
  console.log('Success:', result1 !== null);
  
  // Test 2: Invalid JSON string
  console.log('\nTest 2: Invalid JSON string');
  const invalidJson = '{"data": {"nodes": {"0": {"count": 1}'; // Missing closing braces
  const result2 = safeJsonParse(invalidJson, {
    defaultValue: { error: 'Invalid JSON' },
    throwOnError: false
  });
  console.log('Result:', result2);
  console.log('Success:', result2.error === 'Invalid JSON');
  
  // Test 3: Empty string
  console.log('\nTest 3: Empty string');
  const result3 = safeJsonParse('', {
    defaultValue: { empty: true },
    throwOnError: false
  });
  console.log('Result:', result3);
  console.log('Success:', result3.empty === true);
  
  // Test 4: Already parsed object
  console.log('\nTest 4: Already parsed object');
  const parsedObject = { test: 'data' };
  const result4 = safeJsonParse(parsedObject, {
    defaultValue: null,
    throwOnError: false
  });
  console.log('Result:', result4);
  console.log('Success:', result4 === parsedObject);
  
  // Test 5: Null/undefined
  console.log('\nTest 5: Null/undefined');
  const result5a = safeJsonParse(null, {
    defaultValue: { null: true },
    throwOnError: false
  });
  const result5b = safeJsonParse(undefined, {
    defaultValue: { undefined: true },
    throwOnError: false
  });
  console.log('Null result:', result5a);
  console.log('Undefined result:', result5b);
  console.log('Success:', result5a.null === true && result5b.undefined === true);
  
  // Test 6: isValidJson function
  console.log('\nTest 6: isValidJson function');
  console.log('Valid JSON:', isValidJson(testCorrelationData));
  console.log('Invalid JSON:', isValidJson(invalidJson));
  console.log('Empty string:', isValidJson(''));
  console.log('Null:', isValidJson(null));
  
  console.log('\n=== All Tests Complete ===');
  
  return {
    test1: result1 !== null,
    test2: result2.error === 'Invalid JSON',
    test3: result3.empty === true,
    test4: result4 === parsedObject,
    test5: result5a.null === true && result5b.undefined === true,
    test6: isValidJson(testCorrelationData) && !isValidJson(invalidJson)
  };
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testJsonUtils = runTests;
} 