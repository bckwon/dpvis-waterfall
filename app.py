#! /bin/python

"""
Waterfall
Desription: Waterfall
Contributers: Bum Chul Kwon
Documentation:

Created on 05/12/2020
"""
import os
import numpy as np
from flask import Flask, request, render_template
import pandas as pd
import simplejson
from src.trajectory import Trajectory

app = Flask(__name__)
csv_file_path = os.path.join(app.root_path, 'static/data', 'dpvis-sample-data.csv')

@app.route('/', methods=['POST', 'GET'])
def index():
	# type
	dataset = "P" # "NP"

	# load csv file
	dframe = pd.read_csv(csv_file_path)
	SUBJID = 'participant_id'
	df = dframe[[SUBJID, 'age', 'state', 'ground truth']]
	data = list(df.T.to_dict().values())

	# generate trajectory table
	tr = Trajectory(dframe)
	data = df[df[SUBJID].isin(tr.data[tr.data['Trajectory']!='TRX'][SUBJID].unique())]
	data = list(data.T.to_dict().values())
	tr = tr.outcome()

	return render_template('index.html', data=simplejson.dumps({'data': data, 'traj': tr, 'dataset': dataset}, ignore_nan=True))

@app.route('/toggle_dataset', methods=['POST', 'GET'])
def toggle_dataset():
	dataset = request.get_json('dataset')['dataset']
	SUBJID = 'participant_id'
	dframe = pd.read_csv(csv_file_path)

	case_id = dframe[dframe['ground truth'] == 1][SUBJID].unique()

	if dataset =='P':
		dframe = dframe[dframe[SUBJID].isin(case_id)]
	elif dataset == 'NP':
		dframe = dframe[~dframe[SUBJID].isin(case_id)]

	df = dframe[[SUBJID, 'age', 'state', 'ground truth']]
	data = list(df.T.to_dict().values())

	# generate trajectory table
	tr = Trajectory(dframe)
	data = df[df[SUBJID].isin(tr.data[tr.data['Trajectory']!='TRX'][SUBJID].unique())]
	data = list(data.T.to_dict().values())
	tr = tr.outcome()

	return simplejson.dumps({'data': data, 'traj': tr, 'dataset': dataset}, ignore_nan=True)

port = int(os.getenv('PORT', '4848'))
if __name__ == "__main__":
	app.run(host='0.0.0.0', port=int(port),debug=True)