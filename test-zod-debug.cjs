const { z } = require('zod');

const schema = z.record(z.any());

const testData = {
  title: 'Updated Title',
  description: 'Updated description',
  paginate: 15
};

console.log('Testing Zod validation with z.record(z.any())');
console.log('Input:', JSON.stringify(testData, null, 2));

const result = schema.safeParse(testData);
console.log('\nResult:', JSON.stringify(result, null, 2));
