#!/usr/bin/env python3
import argparse
import requests
import json
import base64

def post_signup(username, email, password, role):
    data = {
            "username": username,
            "email": email,
            "password": password,
            "role": role,
            }
    url = "http://localhost:5000" + "/signup"
    headers = {'Content-Type': 'application/json'}
    response = requests.post(url, headers=headers, json=data)
    print("Status Code:", response.status_code)
    print("Response Text:", response.text) 
    print("{} {}".format(response.status_code, response.json()))

def post_signin(email, password):
    url =  "http://localhost:5000" + "/signin"
    print(password)
    authorization = email + ":" + password
    authorization = authorization.encode('utf-8')
    authorization = base64.b64encode(authorization)
    authorization = authorization.decode('utf-8')
    authorization = "Basic " + authorization

    headers = {
               "authorization": authorization
            }
    response = requests.get(url, headers=headers)
    print("Status Code:", response.status_code)
    print("Response Text:", response.text)
    print("{} {}".format(response.status_code, response.json()))

def post_signout(token):
    headers = {
            "x-token": token,
            }
    url = url + "/signout"
    response = requests.get(url, headers=headers)
    print("{} {}".format(response.status_code, response.json()))

def post_verify(url, query):
    params = {
               "token": query
            }
    response = requests.get(url, params=params)
    print("{} {}".format(response.status_code, response.json()))

def post_create_employer(token, title, description, createdAt):
    headers = {
               "x-token": token
            }
    data = {
            "title": title,
            "description": description,
            "createdAt": createdAt
            }
    url = url + "/jobs"
    response = requests.post(url, headers=headers, json=data)
    print("{} {}".format(response.status_code, response.json()))

def post_update_employer(jobId, token, **kwargs):
    headers = {
               "x-token": token
            }
    data = {}
    for key, value in kwargs.items():
        if key == 'title':
            data[key] = value
        elif key == 'description':
            data[key] = value
        elif key == 'createdAt':
            data[key] = value
    url = f"http://localhost:5000/jobs/{jobId}"
    response = requests.put(url, headers=headers, json=data)
    print("{} {}".format(response.status_code, response.json()))

def post_job_applications(jobId, token):
    headers = {
            "x-token": token
            }
    url = f"http://localhost:5000/jobs/{jobId}/applications"
    response = requests.get(url, headers=headers)
    print("{} {}".format(response.status_code, response.json()))

def post_apply_job(jobId, token,file_path):
    headers= {
            "x-token": token
            }
    url = f"http://localhost:5000/jobs/{jobId}/apply"
    with open(file_path, 'rb') as file:
        files = {'file': (file_path, file, 'application/pdf')}
        response = requests.post(url, headers=headers, files=files)
        print("{} {}".format(response.status_code, response.json()))

def main():
    parser = argparse.ArgumentParser(description="API Testing Script")
    subparsers = parser.add_subparsers(dest='command', required=True)

    signup_parser = subparsers.add_parser('signup', help='Signup')
    signup_parser.add_argument('--username', required=True)
    signup_parser.add_argument('--email', required=True)
    signup_parser.add_argument('--password', required=True)
    signup_parser.add_argument('--role', required=True)

    signin_parser = subparsers.add_parser('signin', help='login')
    signin_parser.add_argument('--email', required=True)
    signin_parser.add_argument('--password', required=True)

    create_employer = subparsers.add_parser('create_employer', help='create job')
    create_employer.add_argument('--title', required=True)
    create_employer.add_argument('--description', required=True)
    create_employer.add_argument('--createdAt', required=True)
   
    update_employer = subparsers.add_parser('update_employer', help='Update employer detail')
    update_employer.add_argument('--jobId', required=True)
    update_employer.add_argument('--token', required=True)
    update_employer.add_argument('--data', metavar='KEY=VALUE', nargs='+', type=parse_key_value_pair, help='Additional data in key=value format')
    
    job_applications = subparsers.add_parser('job_applications', help='View job applications')
    job_applications.add_argument('--jobId', required=True)
    job_applications.add_argument('--token', required=True)

    upload_file = subparsers.add_parser('upload_file', help='Job seeker uploads a file')
    upload_fi4le.add_argument('--jobId', required=True)
    upload_file.add_argument('--token', required=True)
    upload_file.add_argument('--filepath', required=True)

    args = parser.parse_args()
    if args.command == 'signup':
        post_signup(args.username, args.email, args.password, args.role)
    elif args.command == 'signin':
        post_signin(args.email, args.password)
    elif arg.command == 'employer_update':
        post_update_employer(args.jobId, args.token, args.data)
    elif arg.command == 'job_applications':
        post_job_applications(args.jobId, args.token)
    elif arg.command = 'upload_file':
        post_apply_job(args.jobId, args.token, args.file_path)

if __name__ == "__main__":
    main()

