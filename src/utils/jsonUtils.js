/**
 * Utility functions for handling text-to-JSON conversion
 */

/**
 * Safely converts text to JSON with error handling
 * @param {string|object} data - The data to convert (string or already parsed object)
 * @param {object} options - Conversion options
 * @param {boolean} options.throwOnError - Whether to throw on error (default: false)
 * @param {any} options.defaultValue - Default value to return on error (default: null)
 * @param {boolean} options.validateSchema - Whether to validate JSON schema (default: false)
 * @param {object} options.schema - Schema to validate against (if validateSchema is true)
 * @returns {object|null} - Parsed JSON object or null/default value on error
 */
export const safeJsonParse = (data, options = {}) => {
  const {
    throwOnError = false,
    defaultValue = null,
    validateSchema = false,
    schema = null
  } = options;

  // If data is already an object, return it
  if (typeof data === 'object' && data !== null) {
    return data;
  }

  // If data is not a string, return default value
  if (typeof data !== 'string') {
    if (throwOnError) {
      throw new Error('Data must be a string for JSON parsing');
    }
    return defaultValue;
  }

  // Trim whitespace
  const trimmedData = data.trim();
  
  // Check if string is empty
  if (trimmedData === '') {
    if (throwOnError) {
      throw new Error('Empty string cannot be parsed as JSON');
    }
    return defaultValue;
  }

  try {
    const parsed = JSON.parse(trimmedData);
    
    // Validate schema if requested
    if (validateSchema && schema) {
      const isValid = validateJsonSchema(parsed, schema);
      if (!isValid) {
        throw new Error('JSON does not match required schema');
      }
    }
    
    return parsed;
  } catch (error) {
    if (throwOnError) {
      throw new Error(`JSON parsing failed: ${error.message}`);
    }
    console.warn('JSON parsing failed:', error.message, 'Data:', data.substring(0, 100) + '...');
    return defaultValue;
  }
};

/**
 * Validates JSON against a schema
 * @param {object} data - The data to validate
 * @param {object} schema - The schema to validate against
 * @returns {boolean} - Whether the data matches the schema
 */
export const validateJsonSchema = (data, schema) => {
  // Basic schema validation - can be extended with a proper JSON schema library
  if (schema.type && typeof data !== schema.type) {
    return false;
  }
  
  if (schema.required && Array.isArray(schema.required)) {
    for (const field of schema.required) {
      if (!(field in data)) {
        return false;
      }
    }
  }
  
  return true;
};

/**
 * Converts data to JSON string with error handling
 * @param {any} data - The data to convert to JSON
 * @param {object} options - Conversion options
 * @param {number} options.indent - Number of spaces for indentation (default: 2)
 * @param {boolean} options.throwOnError - Whether to throw on error (default: false)
 * @param {string} options.defaultValue - Default value to return on error (default: '{}')
 * @returns {string} - JSON string or default value on error
 */
export const safeJsonStringify = (data, options = {}) => {
  const {
    indent = 2,
    throwOnError = false,
    defaultValue = '{}'
  } = options;

  try {
    return JSON.stringify(data, null, indent);
  } catch (error) {
    if (throwOnError) {
      throw new Error(`JSON stringification failed: ${error.message}`);
    }
    console.warn('JSON stringification failed:', error.message);
    return defaultValue;
  }
};

/**
 * Checks if a string is valid JSON
 * @param {string} str - The string to check
 * @returns {boolean} - Whether the string is valid JSON
 */
export const isValidJson = (str) => {
  if (typeof str !== 'string') {
    return false;
  }
  
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

/**
 * Deep clones an object using JSON serialization
 * @param {any} obj - The object to clone
 * @returns {any} - The cloned object
 */
export const deepClone = (obj) => {
  return safeJsonParse(safeJsonStringify(obj), { throwOnError: true });
};

/**
 * Merges multiple JSON strings or objects
 * @param {...any} items - Items to merge
 * @returns {object} - Merged object
 */
export const mergeJson = (...items) => {
  const result = {};
  
  for (const item of items) {
    const parsed = safeJsonParse(item);
    if (parsed && typeof parsed === 'object') {
      Object.assign(result, parsed);
    }
  }
  
  return result;
}; 