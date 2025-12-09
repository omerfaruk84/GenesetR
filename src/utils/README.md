# JSON Utility Functions

This directory contains utility functions for handling text-to-JSON conversion with robust error handling and validation.

## Overview

The JSON utility functions provide safe and reliable ways to convert text data to JSON objects, handle parsing errors gracefully, and validate JSON structure. These functions are particularly useful when working with API responses that might be returned as text strings.

## Functions

### `safeJsonParse(data, options)`

Safely converts text to JSON with comprehensive error handling.

**Parameters:**
- `data` (string|object): The data to convert (string or already parsed object)
- `options` (object): Configuration options
  - `throwOnError` (boolean): Whether to throw on error (default: false)
  - `defaultValue` (any): Default value to return on error (default: null)
  - `validateSchema` (boolean): Whether to validate JSON schema (default: false)
  - `schema` (object): Schema to validate against (if validateSchema is true)

**Returns:** Parsed JSON object or null/default value on error

**Example:**
```javascript
import { safeJsonParse } from './utils/jsonUtils';

// Basic usage
const result = safeJsonParse('{"name": "John", "age": 30}');

// With error handling
const result = safeJsonParse(invalidJson, {
  defaultValue: { error: 'Invalid data' },
  throwOnError: false
});
```

### `safeJsonStringify(data, options)`

Converts data to JSON string with error handling.

**Parameters:**
- `data` (any): The data to convert to JSON
- `options` (object): Configuration options
  - `indent` (number): Number of spaces for indentation (default: 2)
  - `throwOnError` (boolean): Whether to throw on error (default: false)
  - `defaultValue` (string): Default value to return on error (default: '{}')

**Returns:** JSON string or default value on error

**Example:**
```javascript
import { safeJsonStringify } from './utils/jsonUtils';

const jsonString = safeJsonStringify(data, {
  indent: 2,
  throwOnError: false
});
```

### `isValidJson(str)`

Checks if a string is valid JSON.

**Parameters:**
- `str` (string): The string to check

**Returns:** Boolean indicating if the string is valid JSON

**Example:**
```javascript
import { isValidJson } from './utils/jsonUtils';

const isValid = isValidJson('{"key": "value"}'); // true
const isInvalid = isValidJson('{"key": "value"'); // false
```

### `deepClone(obj)`

Deep clones an object using JSON serialization.

**Parameters:**
- `obj` (any): The object to clone

**Returns:** Deep cloned object

**Example:**
```javascript
import { deepClone } from './utils/jsonUtils';

const original = { name: 'John', address: { city: 'NYC' } };
const cloned = deepClone(original);
```

### `mergeJson(...items)`

Merges multiple JSON strings or objects.

**Parameters:**
- `...items` (any): Items to merge (strings or objects)

**Returns:** Merged object

**Example:**
```javascript
import { mergeJson } from './utils/jsonUtils';

const merged = mergeJson(
  '{"name": "John"}',
  '{"age": 30}',
  { city: 'NYC' }
);
```

## Usage in the Application

### API Response Handling

When handling API responses that might be returned as text:

```javascript
import { safeJsonParse } from '../utils/jsonUtils';

// In your component or store
const handleApiResponse = (response) => {
  const parsedData = safeJsonParse(response, {
    defaultValue: { status: 'error', data: [] },
    throwOnError: false
  });
  
  if (parsedData.status === 'error') {
    // Handle error case
    console.error('Failed to parse API response');
    return;
  }
  
  // Use parsed data
  setData(parsedData.data);
};
```

### Store Integration

In Redux stores where results might be text:

```javascript
import { safeJsonParse } from '../utils/jsonUtils';

// In your reducer
resultReceived: (state, action) => {
  const { result, module } = action.payload;
  state[module].result = safeJsonParse(result, {
    defaultValue: {},
    throwOnError: false
  });
  state[module].running = false;
}
```

### Component Usage

In React components:

```javascript
import { safeJsonParse } from '../utils/jsonUtils';

// In useEffect or event handler
useEffect(() => {
  if (data && data.geneRegulationResults) {
    const downstream = safeJsonParse(data.geneRegulationResults.downstream, {
      defaultValue: {}
    });
    setDownStream(downstream);
  }
}, [data]);
```

## Error Handling

The utility functions provide several levels of error handling:

1. **Graceful degradation**: Return default values instead of throwing errors
2. **Logging**: Console warnings for debugging
3. **Schema validation**: Optional validation of JSON structure
4. **Type checking**: Handle different input types appropriately

## Best Practices

1. **Always provide default values** for critical data
2. **Use schema validation** for important data structures
3. **Log errors** for debugging but don't break the UI
4. **Handle edge cases** like empty strings, null, and undefined
5. **Use consistent error handling** across your application

## Migration from Direct JSON.parse

Replace direct `JSON.parse()` calls with `safeJsonParse()`:

```javascript
// Before
const data = JSON.parse(response);

// After
const data = safeJsonParse(response, {
  defaultValue: {},
  throwOnError: false
});
```

## Testing

See `jsonUtils.example.js` for comprehensive examples of all functions and their usage patterns. 