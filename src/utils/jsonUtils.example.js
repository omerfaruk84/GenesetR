/**
 * Example usage of JSON utility functions
 * This file demonstrates how to use the safeJsonParse and related functions
 * in various scenarios where text-to-JSON conversion is needed
 */

import { 
  safeJsonParse, 
  safeJsonStringify, 
  isValidJson, 
  deepClone, 
  mergeJson 
} from './jsonUtils';

// Example 1: Basic text-to-JSON conversion
export const exampleBasicConversion = () => {
  // API response as text
  const apiResponseText = '{"status": "success", "data": [1, 2, 3]}';
  
  // Safe parsing with error handling
  const parsedData = safeJsonParse(apiResponseText, {
    defaultValue: { status: 'error', data: [] },
    throwOnError: false
  });
  
  console.log('Parsed data:', parsedData);
  // Output: { status: 'success', data: [1, 2, 3] }
  
  return parsedData;
};

// Example 2: Handling invalid JSON
export const exampleInvalidJson = () => {
  const invalidJson = '{"status": "success", "data": [1, 2, 3}'; // Missing closing bracket
  
  const parsedData = safeJsonParse(invalidJson, {
    defaultValue: { status: 'error', message: 'Invalid JSON' },
    throwOnError: false
  });
  
  console.log('Parsed data:', parsedData);
  // Output: { status: 'error', message: 'Invalid JSON' }
  
  return parsedData;
};

// Example 3: Handling empty or null data
export const exampleEmptyData = () => {
  const emptyString = '';
  const nullData = null;
  const undefinedData = undefined;
  
  const emptyResult = safeJsonParse(emptyString, { defaultValue: {} });
  const nullResult = safeJsonParse(nullData, { defaultValue: {} });
  const undefinedResult = safeJsonParse(undefinedData, { defaultValue: {} });
  
  console.log('Empty string result:', emptyResult); // {}
  console.log('Null result:', nullResult); // {}
  console.log('Undefined result:', undefinedResult); // {}
  
  return { emptyResult, nullResult, undefinedResult };
};

// Example 4: Schema validation
export const exampleSchemaValidation = () => {
  const userData = '{"name": "John", "age": 30, "email": "john@example.com"}';
  
  const userSchema = {
    type: 'object',
    required: ['name', 'age']
  };
  
  const validUser = safeJsonParse(userData, {
    validateSchema: true,
    schema: userSchema,
    defaultValue: null
  });
  
  console.log('Valid user:', validUser);
  // Output: { name: 'John', age: 30, email: 'john@example.com' }
  
  return validUser;
};

// Example 5: Converting data back to JSON string
export const exampleJsonStringify = () => {
  const data = {
    name: 'John Doe',
    age: 30,
    hobbies: ['reading', 'coding']
  };
  
  const jsonString = safeJsonStringify(data, {
    indent: 2,
    throwOnError: false
  });
  
  console.log('JSON string:', jsonString);
  // Output: Formatted JSON string
  
  return jsonString;
};

// Example 6: Deep cloning objects
export const exampleDeepClone = () => {
  const original = {
    name: 'John',
    address: {
      street: '123 Main St',
      city: 'New York'
    },
    hobbies: ['reading', 'coding']
  };
  
  const cloned = deepClone(original);
  cloned.address.city = 'Los Angeles';
  cloned.hobbies.push('swimming');
  
  console.log('Original:', original);
  console.log('Cloned:', cloned);
  // Original remains unchanged
  
  return { original, cloned };
};

// Example 7: Merging multiple JSON objects
export const exampleMergeJson = () => {
  const userInfo = '{"name": "John", "age": 30}';
  const preferences = '{"theme": "dark", "language": "en"}';
  const settings = { notifications: true, autoSave: false };
  
  const merged = mergeJson(userInfo, preferences, settings);
  
  console.log('Merged data:', merged);
  // Output: { name: 'John', age: 30, theme: 'dark', language: 'en', notifications: true, autoSave: false }
  
  return merged;
};

// Example 8: Checking if string is valid JSON
export const exampleValidation = () => {
  const validJson = '{"key": "value"}';
  const invalidJson = '{"key": "value"'; // Missing closing brace
  
  console.log('Valid JSON?', isValidJson(validJson)); // true
  console.log('Invalid JSON?', isValidJson(invalidJson)); // false
  
  return {
    valid: isValidJson(validJson),
    invalid: isValidJson(invalidJson)
  };
};

// Example 9: Real-world API response handling
export const exampleApiResponse = () => {
  // Simulate API response that might be text or object
  const apiResponses = [
    '{"status": "success", "data": {"genes": ["GENE1", "GENE2"]}}',
    { status: 'success', data: { genes: ['GENE3', 'GENE4'] } },
    'invalid json string',
    null
  ];
  
  const processedResponses = apiResponses.map((response, index) => {
    const parsed = safeJsonParse(response, {
      defaultValue: { status: 'error', data: { genes: [] } },
      throwOnError: false
    });
    
    return {
      original: response,
      parsed,
      index
    };
  });
  
  console.log('Processed API responses:', processedResponses);
  
  return processedResponses;
};

// Example 10: Error handling with throwOnError
export const exampleErrorHandling = () => {
  const invalidJson = '{"status": "success", "data": [1, 2, 3}'; // Missing bracket
  
  try {
    const result = safeJsonParse(invalidJson, {
      throwOnError: true
    });
    return result;
  } catch (error) {
    console.error('Caught error:', error.message);
    return { error: error.message };
  }
};

// Export all examples for testing
export const runAllExamples = () => {
  console.log('=== JSON Utils Examples ===');
  
  exampleBasicConversion();
  exampleInvalidJson();
  exampleEmptyData();
  exampleSchemaValidation();
  exampleJsonStringify();
  exampleDeepClone();
  exampleMergeJson();
  exampleValidation();
  exampleApiResponse();
  exampleErrorHandling();
  
  console.log('=== Examples Complete ===');
}; 