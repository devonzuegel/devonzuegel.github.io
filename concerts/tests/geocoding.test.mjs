import test from 'node:test';import assert from 'node:assert/strict';
import {matchAddress} from '../server/geocoding.mjs';
import {enrichVenue,mergeVenueRecords} from '../shared/venue-profiles.js';
test('verified venue locations fill both problem venues, preserving existing pins',()=>{
 for(const name of ['Audio','620 Jones Terrace']) {
  const venue=enrichVenue({name,lat:null,lng:null},'sf');
  assert.ok(Number.isFinite(venue.lat));assert.ok(Number.isFinite(venue.lng));assert.equal(venue.locality,'San Francisco');assert.ok(venue.provenance.coordinates.sources.length);
 }
 const venue=enrichVenue({name:'Audio',lat:37.7,lng:-122.4},'sf');assert.equal(venue.lat,37.7);
 assert.equal(enrichVenue({name:'Audio',locality:'Oakland'},'sf').lat,undefined);
});
test('shared-list null coordinates cannot overwrite known venue coordinates',()=>{
 const venue=mergeVenueRecords({lat:37.7,lng:-122.4,address:'316 11th Street'},{lat:null,lng:null,address:''});
 assert.equal(venue.lat,37.7);assert.equal(venue.address,'316 11th Street');
});
test('address geocoder rejects ambiguous results and mismatched addresses or cities',()=>{
 const venue={address:'620 Jones Street, San Francisco',locality:'San Francisco'};
 const m={matchedAddress:'620 JONES ST, SAN FRANCISCO, CA, 94102',addressComponents:{city:'SAN FRANCISCO'},coordinates:{x:-122.41315,y:37.78704}};
 assert.equal(matchAddress(venue,[m]),m);assert.equal(matchAddress(venue,[m,m]),null);
 assert.equal(matchAddress(venue,[{...m,matchedAddress:'620 HOWARD ST, SAN FRANCISCO'}]),null);
 assert.equal(matchAddress(venue,[{...m,addressComponents:{city:'OAKLAND'}}]),null);
});
