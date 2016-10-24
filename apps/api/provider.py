#!/user/bin/env python
# encoding:utf-8
   

import os
import time
import random
import json
import datetime
from datetime import datetime as dt
from bson.objectid import ObjectId
from settings import DB, REDIS, ENV
from django.http import Http404, HttpResponse
from django.contrib.auth import authenticate
from apps.base.common import json_response, get_json_data, get_user
from apps.base.common import base_login_required as login_required
from apps.base.models import User, Maintenance, MaintenanceUsers, Member
from apps.base.messages import *
from apps.base.push import push_message
from apps.base.logger import getlogger
from apps.base.utils import login, _send_count
from settings import DEBUG, HOST_NAME, ENV, REDIS
from apps.base.sms import send_sms
from apps.base.uploader import upload as _upload

  
logger = getlogger(__name__)

'''
    test user:15017935316/000000
'''

@login_required('2')
def opinion(request, oid):
    """  经理意见,维修工主管意见

    :uri: /api/v1/service/opinion/<oid> oid 为维修单id
    :post:
        * content 意见

    """
    resp = {'status': 0, 'info': {}, 'alert': ''}
    user = get_user(request)
    data = get_json_data(request) or request.POST.dict()
    content = data.get('content')
    members = [str(i.id) for i in Member.objects.filter(opt_user=user).distinct('user')]
    bill = Bill.objects.filter(maintenance=ObjectId(oid), status__gt=0, user__in=members).first()
    if not bill:
        resp['alert'] = u'该维修单不存在或者无该权限'
        return json_response(resp)
    if not content:
        resp['alert'] = u'意见不得为空'
        return json_response(resp)
    bill.manager_content = content
    bill.save()
    return json_response(resp)

    
@login_required('2')
def online(request):
    """  在线人数

    :uri: /api/v1/provider/online

    :Return:
        * user_id 用户id
        * user_name 用户名称
        * logo  用户头像
        * mobile 用户手机号码
        * status 1为忙 0为闲

    """
    
    resp = {'status': 0, 'info': {}, 'alert': ''}
    data = get_json_data(request) or request.POST.dict()
    user = get_user(request)
    members = Member.objects.filter(opt_user=user).distinct('user')
    results = []
    for member in members:
        mus    = Maintenance.objects.filter(grab_user = member, status__in=[1, 3]).first()
        results.append({    
                        'user_id':member.id,
                        'user_name':member.name,
                        'logo':member.avatar_img,
                        'mobile':member.username,
                        'status':1 if mus else 0
                        })
    resp['status'], resp['info']['results'] = 1, results
    return json_response(resp)


@login_required('2')
def repairs(request):
    """  修单列表

    :uri: /api/v1/provider/repairs
    :POST params:
        * p 当前页面，默认1
    :return:
        * 请参考 uri: /api/v1/merchant/maintenance/<oid>
    """
    
    resp = {'status': 1, 'info': {}, 'alert': ''}
    user = get_user(request)
    data = get_json_data(request) or request.POST.dict()
    p    = int(data.get('p', 1))
    result  = []
    members = [str(i.id) for i in Member.objects.filter(opt_user=user).distinct('user')]
    mtce = Maintenance.objects.filter(members__in=members, status__gte=0,head_type=user.head_type).order_by('-create_time').skip((p-1)*20).limit(20)
    for m in mtce:
        result.append(m.get_result())
    resp['info']['results'] = result
    return json_response(resp)


@login_required('2')
def repair(request, oid):
    """  修单详细

    :uri: /api/v1/provider/repair/<oid>
    :return:
        * 请参考 uri: /api/v1/merchant/maintenance/<oid>

    """
    resp = {'status': 0, 'info': {}, 'alert': ''}
    user = get_user(request)
    members = [str(i.id) for i in Member.objects.filter(opt_user=user).distinct('user')]
    mtce = Maintenance.objects.filter(id = ObjectId(oid), status__gte=0, members__in=members).first()
    resp['info'],resp['status'] = mtce.get_result(), 1
    return json_response(resp)


@login_required('2')
def dispatch(request, oid):
    """  维修工主管派单

    :uri: /api/v1/provider/dispatch/<oid>
    :POST params:
        * uid 多个请用,号隔开
    :return:
        * 

    """
    resp = {'status': 0, 'info': {}, 'alert': ''}
    user = get_user(request)
    data = get_json_data(request) or request.POST.dict()
    uids = data.get('uid')
    members = [str(i.id) for i in Member.objects.filter(opt_user=user).distinct('user')]
    mtce    = Maintenance.objects.filter(id = ObjectId(oid), status__gte=0, members__in=members).first()
    member_users = User.objects.filter(id__in=[ObjectId(uid) for uid in uids.split(',')])
    for key in ['id', 'code', 'grab_user', 'members']:
        delattr(mtce, key)
    data = {
            'members':member_users, 
            'code':_send_count(user.head_type),
            'create_time':dt.now(), 'update_time':dt.now()
            }
   
    for k, v in data.iteritems():
        setattr(mtce, k, v)
    mtce.save()
    resp['status'] = 1
    return json_response(resp)




