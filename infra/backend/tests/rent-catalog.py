#!/usr/bin/env python3
"""Check the live public catalog using temporary records; removes all fixtures."""
import json, os, uuid, urllib.request

GRAPHQL = os.environ.get('HASURA_GRAPHQL_URL', 'http://localhost:8080/v1/graphql')
API = os.environ.get('API_URL', 'http://localhost:3002')
SECRET = os.environ.get('HASURA_GRAPHQL_ADMIN_SECRET', 'myadminsecretkey')
def gql(query, variables=None):
    request = urllib.request.Request(GRAPHQL, data=json.dumps({'query': query, 'variables': variables or {}}).encode(), headers={'content-type': 'application/json', 'x-hasura-admin-secret': SECRET})
    result = json.load(urllib.request.urlopen(request, timeout=15))
    assert not result.get('errors'), result
    return result['data']
def catalog(kind):
    return json.load(urllib.request.urlopen(f'{API}/api/listings?kind={kind}', timeout=15))['properties']

uid = f'catalog-test-{uuid.uuid4()}'
owner = hotel = apartment = room_type = None
try:
    gql('mutation($id:String!,$email:String!){insert_users_one(object:{id:$id,email:$email}){id}}', {'id':uid,'email':uid+'@test.invalid'})
    apartment = gql('mutation($owner:String!){insert_apartments_one(object:{owner_id:$owner,name:"Catalog apartment",price:1200,warranty_deposit:2400,coordinates:"(9.9,-84.0)",address:{city:"San José",street:"Test street"},available_from:"2030-01-01T00:00:00Z",image_urls:["/img/room1.png"]}){id}}', {'owner':uid})['insert_apartments_one']['id']
    owner = gql('mutation($email:String!){insert_hotel_users_one(object:{email:$email,role:"MANAGER"}){id}}', {'email':uid+'-hotel@test.invalid'})['insert_hotel_users_one']['id']
    hotel = gql('mutation($owner:uuid!){insert_hotels_one(object:{owner_user_id:$owner,name:"Catalog hotel",address:"Heredia",images:{data:[{image_url:"/img/room1.png"}]}}){id}}', {'owner':owner})['insert_hotels_one']['id']
    apartments = catalog('apartment')
    hotels = catalog('hotel')
    both = catalog('both')
    assert all(item['kind']=='apartment' for item in apartments)
    assert all(item['kind']=='hotel' for item in hotels)
    assert any(item['id']==apartment for item in apartments)
    saved_hotel = next(item for item in hotels if item['id']==hotel)
    assert saved_hotel['price'] is None and saved_hotel['images']==['/img/room1.png']
    assert any(item['id']==apartment and item['kind']=='apartment' for item in both)
    assert any(item['id']==hotel and item['kind']=='hotel' for item in both)
    assert 'ownerId' not in saved_hotel
    print('PASS: apartments, hotels, and both select registered records with photos')
    print('PASS: unconfigured hotel rates remain unset and private hotel data is omitted')
    room_type = gql('mutation($name:String!){insert_room_types_one(object:{name:$name}){id}}', {'name':uid})['insert_room_types_one']['id']
    gql('mutation($hotel:uuid!,$type:uuid!){insert_rooms_one(object:{hotel_id:$hotel,room_number:"101",room_type_id:$type,price_night:80,capacity:2}){room_id}}', {'hotel':hotel,'type':room_type})
    assert next(item for item in catalog('hotel') if item['id']==hotel)['price']==80
    print('PASS: hotel catalog rate reflects available room pricing')
finally:
    if hotel:
        gql('mutation($id:uuid!){delete_rooms(where:{hotel_id:{_eq:$id}}){affected_rows} delete_hotels_by_pk(id:$id){id}}', {'id':hotel})
    if room_type: gql('mutation($id:uuid!){delete_room_types_by_pk(id:$id){id}}', {'id':room_type})
    if owner: gql('mutation($id:uuid!){delete_hotel_users_by_pk(id:$id){id}}', {'id':owner})
    if apartment: gql('mutation($id:uuid!){delete_apartments_by_pk(id:$id){id}}', {'id':apartment})
    gql('mutation($id:String!){delete_users_by_pk(id:$id){id}}', {'id':uid})
