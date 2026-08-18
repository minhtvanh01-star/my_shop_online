import assert from 'node:assert/strict';
import { test } from 'node:test';
import { convertCatalogAmount, parseExchangeRate, resolveOrderCurrency } from './exchange.ts';

test('parseExchangeRate falls back when invalid', () => {
  assert.equal(parseExchangeRate('25000'), 25000);
  assert.equal(parseExchangeRate('nope'), 25000);
  assert.equal(parseExchangeRate(null), 25000);
});

test('convertCatalogAmount USD to VND', () => {
  assert.equal(convertCatalogAmount(10, 'USD', 'VND', 25000), 250000);
  assert.equal(convertCatalogAmount(10.4, 'USD', 'VND', 25000), 260000);
});

test('convertCatalogAmount same currency', () => {
  assert.equal(convertCatalogAmount(1600000, 'VND', 'VND', 25000), 1600000);
  assert.equal(convertCatalogAmount(12.5, 'USD', 'USD', 25000), 12.5);
});

test('resolveOrderCurrency follows locale', () => {
  assert.equal(resolveOrderCurrency('vi', 'USD'), 'VND');
  assert.equal(resolveOrderCurrency('en', 'USD'), 'USD');
  assert.equal(resolveOrderCurrency('en', 'VND'), 'VND');
});
