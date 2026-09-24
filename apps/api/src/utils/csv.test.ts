import assert from 'node:assert/strict';
import { test } from 'node:test';
import { csvRowsToObjects, parseCsv } from './csv.ts';
import { mapWooCsvRow, parseCategoryPaths, parsePrice } from './woo-product-csv.ts';

test('parseCsv keeps commas and newlines inside quotes', () => {
  const rows = parseCsv('A,B\n"1,2","line1\nline2"\n');
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], ['A', 'B']);
  assert.deepEqual(rows[1], ['1,2', 'line1\nline2']);
});

test('csvRowsToObjects maps headers', () => {
  const objects = csvRowsToObjects([
    ['ID', 'Tên'],
    ['614', 'Đèn bàn'],
  ]);
  assert.equal(objects[0].ID, '614');
  assert.equal(objects[0]['Tên'], 'Đèn bàn');
});

test('parseCategoryPaths skips Uncategorized and splits trees', () => {
  const paths = parseCategoryPaths('Chưa phân loại, Sản Phẩm > Đèn Bàn, Sản Phẩm');
  assert.deepEqual(paths, [
    ['Sản Phẩm', 'Đèn Bàn'],
    ['Sản Phẩm'],
  ]);
});

test('mapWooCsvRow leaves specs empty and uses WC sku when blank', () => {
  const mapped = mapWooCsvRow({
    ID: '614',
    Loại: 'simple',
    'Mã sản phẩm': '',
    Tên: 'Đèn bàn gốm',
    'Mô tả ngắn': '<table><tr><td>Chất liệu</td><td>Gốm</td></tr></table>',
    'Mô tả': '<p>Mô tả dài</p>',
    'Giá khuyến mãi': '',
    'Giá bán thường': '1600000',
    'Danh mục': 'Sản Phẩm > Đèn Bàn',
    'Hình ảnh': 'https://example.com/a.jpg, https://example.com/b.jpg',
  });
  assert.ok(mapped);
  assert.equal(mapped?.sku, 'WC-614');
  assert.equal(mapped?.regularPrice, 1600000);
  assert.equal(mapped?.salePrice, null);
  assert.equal(mapped?.imageUrls.length, 2);
  assert.ok(mapped?.shortDescription.includes('Chất liệu'));
});

test('parsePrice ignores empty', () => {
  assert.equal(parsePrice(''), null);
  assert.equal(parsePrice('1,600,000'), 1600000);
});
