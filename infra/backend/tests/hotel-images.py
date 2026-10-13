#!/usr/bin/env python3
"""Live hotel photo transaction checks. Creates temporary fixtures and removes them.
Run after migrations and metadata: python3 infra/backend/tests/hotel-images.py
"""
import json,urllib.request,re,uuid,os
from pathlib import Path
base=os.environ.get('HASURA_GRAPHQL_URL','http://localhost:8080/v1/graphql')
def gql(query,variables=None,role=None,uid=None):
 headers={'content-type':'application/json','x-hasura-admin-secret':os.environ.get('HASURA_GRAPHQL_ADMIN_SECRET','myadminsecretkey')}
 if role: headers.update({'x-hasura-role':role,'x-hasura-user-id':uid})
 req=urllib.request.Request(base,data=json.dumps({'query':query,'variables':variables or {}}).encode(),headers=headers)
 return json.load(urllib.request.urlopen(req,timeout=15))
def ok(result):
 assert not result.get('errors'),result
 return result['data']
service=(Path(__file__).resolve().parents[3] / 'apps/api/src/services/hotels-db.ts').read_text()
create=re.search(r'`(mutation CreateHotel.*?)`',service,re.S).group(1)
update=re.search(r'`(mutation UpdateHotelWithImages.*?)`',service,re.S).group(1)
read=re.search(r'`(query GetHotelById.*?)`',service,re.S).group(1)
uid='image-test-'+str(uuid.uuid4());hotel=None;owner=None;room_type=None
try:
 owner=ok(gql('mutation($uid:String!,$email:String!){insert_hotel_users_one(object:{firebase_uid:$uid,email:$email,role:"MANAGER"}){id}}',{'uid':uid,'email':uid+'@test.invalid'}))['insert_hotel_users_one']['id']
 first={'name':'Atomic Hotel','address':'San José','owner_user_id':owner,'images':{'data':[{'image_url':'https://example.com/old.jpg','position':0}]}}
 hotel=ok(gql(create,{'object':first}))['insert_hotels_one']['id']
 result=ok(gql(read,{'id':hotel}))['hotels_by_pk']
 assert result['images'][0]['image_url']=='https://example.com/old.jpg'
 print('PASS: nested hotel creation persists photos')
 images=[{'hotel_id':hotel,'image_url':'https://example.com/new.jpg','position':0}]*2
 failed=gql(update,{'id':hotel,'set':{'name':'Must roll back'},'images':images})
 assert failed.get('errors'),failed
 result=ok(gql(read,{'id':hotel}))['hotels_by_pk']
 assert result['name']=='Atomic Hotel' and result['images'][0]['image_url']=='https://example.com/old.jpg'
 print('PASS: duplicate photo failure rolls back hotel update and photo deletion')
 ok(gql(update,{'id':hotel,'set':{'name':'Updated Hotel'},'images':images[:1]}))
 result=ok(gql(read,{'id':hotel}))['hotels_by_pk']
 assert result['name']=='Updated Hotel' and result['images'][0]['image_url']=='https://example.com/new.jpg'
 print('PASS: photo replacement commits together with hotel details')
 denied=gql('query($hotel:uuid!){hotel_images(where:{hotel_id:{_eq:$hotel}}){image_url}}',{'hotel':hotel},'hotel_manager','another-manager')
 assert ok(denied)['hotel_images']==[]
 visible=ok(gql('query($hotel:uuid!){hotel_images(where:{hotel_id:{_eq:$hotel}}){image_url}}',{'hotel':hotel},'hotel_manager',uid))
 assert len(visible['hotel_images'])==1
 print('PASS: manager image access remains isolated')
 orphan=gql('mutation($hotel:uuid!){insert_hotel_images_one(object:{hotel_id:$hotel,image_url:"https://example.com/orphan.jpg"}){id}}',{'hotel':str(uuid.uuid4())})
 assert orphan.get('errors')
 print('PASS: foreign key rejects orphan hotel photos')
 room_type=ok(gql('mutation($name:String!){insert_room_types_one(object:{name:$name}){id}}',{'name':uid}))['insert_room_types_one']['id']
 ok(gql('mutation($hotel:uuid!,$type:uuid!){insert_rooms(objects:[{hotel_id:$hotel,room_number:"101",room_type_id:$type,price_night:100,capacity:2,images:{data:[{image_url:"https://example.com/room.jpg"}]}},{hotel_id:$hotel,room_number:"102",room_type_id:$type,price_night:150,capacity:3}]){affected_rows}}',{'hotel':hotel,'type':room_type}))
 frontend=Path(__file__).resolve().parents[3] / 'apps/frontend/src/graphql/queries/hotel-queries.ts'
 frontend_query=re.search(r'GET_HOTEL_BY_ID = gql`(.*?)`',frontend.read_text(),re.S).group(1)
 detailed=ok(gql(frontend_query,{'id':hotel},'hotel_manager',uid))['hotels_by_pk']
 assert len(detailed['rooms'])==2 and detailed['rooms'][0]['images'][0]['image_url']=='https://example.com/room.jpg'
 print('PASS: frontend reads one hotel with multiple rooms and room-specific photos')
 blocked=gql('mutation($id:uuid!){delete_hotels_by_pk(id:$id){id}}',{'id':hotel})
 assert blocked.get('errors')
 print('PASS: rooms restrict hotel deletion')
 ok(gql('mutation($hotel:uuid!){delete_rooms(where:{hotel_id:{_eq:$hotel}}){affected_rows}}',{'hotel':hotel}))
 ok(gql('mutation($id:uuid!){delete_hotels_by_pk(id:$id){id}}',{'id':hotel}))
 assert ok(gql('query($hotel:uuid!){hotel_images(where:{hotel_id:{_eq:$hotel}}){id}}',{'hotel':hotel}))['hotel_images']==[]
 hotel=None
 print('PASS: deleting hotel cascades to hotel photos')
finally:
 if hotel:
  gql('mutation($hotel:uuid!){delete_rooms(where:{hotel_id:{_eq:$hotel}}){affected_rows}}',{'hotel':hotel})
 if hotel: gql('mutation($id:uuid!){delete_hotels_by_pk(id:$id){id}}',{'id':hotel})
 if room_type: gql('mutation($id:uuid!){delete_room_types_by_pk(id:$id){id}}',{'id':room_type})
 if owner: gql('mutation($id:uuid!){delete_hotel_users_by_pk(id:$id){id}}',{'id':owner})
