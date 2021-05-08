import numpy as np
import pandas as pd

class Trajectory:
    def __init__(self, data):
        # table for all:
        self.data = data
        self.SUBJID = 'participant_id'
        self.case_id = data[data['ground truth'] == 1][self.SUBJID].unique()
        self.result = {}

        # trajectory_analysis
        self.trajAnalysis()

        #all
        self.result['all'] = {}
        self.result['all']['trajsum'] = self.trajTable(self.data)
        self.result['all']['trajcount'] = self.trajCount(self.data)

        #case
        case_df = self.data[self.data[self.SUBJID].isin(self.case_id)]
        self.result['P'] = {}
        self.result['P']['trajsum'] = self.trajTable(case_df)
        self.result['P']['trajcount'] = self.trajCount(case_df)

        #non-case
        non_case_df = self.data[~self.data[self.SUBJID].isin(self.case_id)]
        self.result['NP'] = {}
        self.result['NP']['trajsum'] = self.trajTable(non_case_df)
        self.result['NP']['trajcount'] = self.trajCount(non_case_df)

        # name
        self.result['trajname'] = {'TR1': 'Multiple IAb First', 'TR2': 'IAA First', 'TR3': 'GADA First'}
        self.result['progressors'] = self.case_id.tolist()
        self.result['tr-state'] = {}
        self.result['tr-state']['TR1'] = [0, 1, 2]
        self.result['tr-state']['TR2'] = [3, 4, 5, 6, 7]
        self.result['tr-state']['TR3'] = [8, 9, 10]

    def trajAnalysis(self):
        TR1 = set([0, 1, 2])
        TR2 = set([3, 4, 5, 6, 7])
        TR3 = set([8, 9, 10])
        subjids = self.data[self.SUBJID].unique()
        self.data['Trajectory'] = ''
        for subjid in subjids:
            states = set(self.data[self.data[self.SUBJID]==subjid]['state'].tolist())
            trid = 'TRX'
            if states.issubset(TR1):
                trid = 'TR1'
            elif states.issubset(TR2):
                trid = 'TR2'
            elif states.issubset(TR3):
                trid = 'TR3'
            self.data.loc[self.data[self.SUBJID]==subjid, 'Trajectory'] = trid
    
    def trajTable(self, data):
        data = data[data['Trajectory']!='TRX']
        df = data.groupby(['state']).mean().reset_index()[['BM1', 'BM2', 'BM3']]
        df.round(2)
        df['Trajectory'] = ['TR1-0', 'TR1-1', 'TR1-2', 'TR2-0', 'TR2-1', 'TR2-2', 'TR2-3', 'TR2-4', 'TR3-0', 'TR3-1', 'TR3-2']
        df['N'] = data.groupby(['state'])[self.SUBJID].nunique()
        df = df[['Trajectory', 'BM1', 'BM2', 'BM3', 'N']]
        return list(df.T.to_dict().values())

    def trajCount(self, data):
        return data.groupby(['Trajectory'])[self.SUBJID].nunique().to_dict()

    def outcome(self):
        return self.result