import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/common/Modal';
import {
  FiCheckSquare,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiActivity,
  FiFileText,
  FiCheck,
  FiXCircle,
  FiZap,
  FiCpu,
  FiShield,
  FiPlus,
  FiTrash2,
  FiList,
} from 'react-icons/fi';

const Testing = () => {
  const [pendingStages, setPendingStages] = useState([]);
  const [recentTests, setRecentTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal for testing
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [testForm, setTestForm] = useState({
    voltageCheck: 'Pass',
    shortCircuitCheck: 'Pass',
    functionalCheck: 'Pass',
    defectNotes: '',
    testedBy: 'QC Tech',
    checklist: [],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [queueRes, historyRes] = await Promise.all([
        api.get('/testing/queue'),
        api.get('/testing/history'),
      ]);
      setPendingStages(queueRes.data || []);
      setRecentTests(historyRes.data || []);
    } catch (err) {
      console.error('[Testing fetch error]:', err);
      setErrorMsg('Failed to load quality testing queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenTestModal = (stage) => {
    setSelectedStage(stage);
    setTestForm({
      voltageCheck: 'Pass',
      shortCircuitCheck: 'Pass',
      functionalCheck: 'Pass',
      defectNotes: '',
      testedBy: 'QC Tech Admin',
      checklist: [
        { title: 'PCB Voltage Rail Check (5V / 3.3V)', status: 'Pass', notes: 'Stable power rails' },
        { title: 'Continuity & Solder Bridge Inspection', status: 'Pass', notes: 'No shorts found' },
        { title: 'Microcontroller / IC Signal Verification', status: 'Pass', notes: 'Signal clocks OK' },
      ],
    });
    setTestModalOpen(true);
  };

  const handleAddCustomCheckItem = () => {
    setTestForm((prev) => ({
      ...prev,
      checklist: [...prev.checklist, { title: '', status: 'Pass', notes: '' }],
    }));
  };

  const handleUpdateChecklistItem = (idx, field, val) => {
    setTestForm((prev) => {
      const updated = [...prev.checklist];
      updated[idx][field] = val;
      return { ...prev, checklist: updated };
    });
  };

  const handleRemoveChecklistItem = (idx) => {
    setTestForm((prev) => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmitTest = async (e) => {
    e.preventDefault();
    if (!selectedStage) return;

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const res = await api.post(`/testing/verify/${selectedStage._id}`, {
        voltageCheck: testForm.voltageCheck,
        shortCircuitCheck: testForm.shortCircuitCheck,
        functionalCheck: testForm.functionalCheck,
        defectNotes: testForm.defectNotes,
        testedBy: testForm.testedBy,
        checklist: testForm.checklist,
      });

      const isPass = res.data.result === 'Pass';
      setSuccessMsg(
        isPass
          ? `✓ Testing PASSED! Stage ${selectedStage.stageNumber} passed verification and auto-circulated!`
          : `⚠ Test Result FAILED logged for Stage ${selectedStage.stageNumber}.`
      );
      setTestModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit test verification results.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-cyan-500/15 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <FiCheckSquare className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Quality & Functional Testing Line</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Verification line for standard hardware tests, custom verification checklists, functional validation, and automated stage circulation.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center space-x-2">
            <FiClock className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Pending Tests:</span>
            <span className="font-extrabold text-cyan-400 text-sm">{pendingStages.length}</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
          <FiAlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
          <FiCheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Pending Testing Queue Section */}
      <div className="bg-slate-900 border border-cyan-500/15 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center space-x-2">
            <FiActivity className="w-4 h-4 text-cyan-400" />
            <span>Stages Waiting for Testing ({pendingStages.length})</span>
          </h2>
          <span className="text-xs text-slate-400">Passing test auto-circulates stage to next assembly phase</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading testing queue...</div>
        ) : pendingStages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingStages.map((stg) => (
              <div
                key={stg._id}
                className="p-5 rounded-xl bg-slate-950 border border-cyan-500/20 shadow-lg hover:border-cyan-400/50 transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        STAGE {stg.stageNumber}
                      </span>
                      {stg.isFinalStage && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          FINAL STAGE
                        </span>
                      )}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {stg.project?.moduleType || 'Prototype Module'}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-white text-base leading-snug">{stg.stageName}</h3>
                  {stg.subStageName && (
                    <p className="text-xs font-semibold text-cyan-400/90">{stg.subStageName}</p>
                  )}

                  <div className="pt-2 text-xs text-slate-400 space-y-1">
                    <p>Project: <strong className="text-white">{stg.project?.name}</strong> ({stg.project?.code})</p>
                    <p>Components Used: <strong className="text-cyan-400 font-mono">{stg.usedMaterials?.length || 0} items</strong></p>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenTestModal(stg)}
                  className="w-full py-2.5 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition cursor-pointer"
                >
                  <FiShield className="w-4 h-4" />
                  <span>Run Testing & Verification</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400 space-y-1">
            <FiCheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="font-bold text-slate-300 text-sm">Testing Queue Clear</p>
            <p>All completed assembly stages have passed verification or none are waiting for testing.</p>
          </div>
        )}
      </div>

      {/* Recent Test History Table */}
      <div className="bg-slate-900 border border-cyan-500/15 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center space-x-2">
          <FiFileText className="w-4 h-4 text-cyan-400" />
          <span>Recent Test Results & Verification Log ({recentTests.length})</span>
        </h2>

        {recentTests.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Project & Module</th>
                  <th className="p-3">Stage</th>
                  <th className="p-3">Standard Checks</th>
                  <th className="p-3">Custom Verification Checklist</th>
                  <th className="p-3">Overall Result</th>
                  <th className="p-3">Tested By</th>
                  <th className="p-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentTests.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-900/40 transition">
                    <td className="p-3 font-bold text-white">
                      {t.project?.name || 'Project'}
                      <div className="text-[10px] font-normal text-cyan-400">{t.project?.moduleType}</div>
                    </td>
                    <td className="p-3 text-slate-300">
                      <span className="font-bold">Stage {t.stageNumber}:</span> {t.stageName}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.voltageCheck === 'Pass' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          Voltage: {t.voltageCheck}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.shortCircuitCheck === 'Pass' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          Short Circuit: {t.shortCircuitCheck}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.functionalCheck === 'Pass' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          Functional: {t.functionalCheck}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      {t.checklist && t.checklist.length > 0 ? (
                        <div className="space-y-1">
                          {t.checklist.map((chk, i) => (
                            <div key={i} className="flex items-center space-x-1.5 text-[11px]">
                              {chk.status === 'Pass' ? (
                                <FiCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <FiXCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              )}
                              <span className={chk.status === 'Pass' ? 'text-slate-300' : 'text-rose-300 font-bold'}>
                                {chk.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No custom items</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${
                          t.result === 'Pass'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        }`}
                      >
                        {t.result === 'Pass' ? 'PASSED' : 'FAILED'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 font-semibold">{t.testedBy}</td>
                    <td className="p-3 text-right text-slate-400 text-[10px]">
                      {new Date(t.createdAt).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-xs text-slate-400 py-4">No testing logs recorded yet.</p>
        )}
      </div>

      {/* Modal: Run Test Verification */}
      <Modal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        title="Execute Stage Quality & Functional Verification"
        subtitle={`Stage ${selectedStage?.stageNumber}: ${selectedStage?.stageName}`}
      >
        <form onSubmit={handleSubmitTest} className="space-y-4">
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
            <div className="flex justify-between font-bold">
              <span className="text-slate-400">Project Name:</span>
              <span className="text-white">{selectedStage?.project?.name}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-slate-400">Module Type:</span>
              <span className="text-cyan-400">{selectedStage?.project?.moduleType}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-slate-400">Sub-stage:</span>
              <span className="text-slate-300">{selectedStage?.subStageName || 'Main Stage'}</span>
            </div>
          </div>

          {/* Standard Hardware Checks */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
              Standard Hardware Verification
            </h4>

            {/* Voltage Check */}
            <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="flex items-center space-x-2 text-xs">
                <FiZap className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white">Voltage & Power Rail Check</span>
              </div>
              <select
                value={testForm.voltageCheck}
                onChange={(e) => setTestForm({ ...testForm, voltageCheck: e.target.value })}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border bg-slate-900 ${
                  testForm.voltageCheck === 'Pass' ? 'text-emerald-400 border-emerald-500/40' : 'text-rose-400 border-rose-500/40'
                }`}
              >
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
              </select>
            </div>

            {/* Short Circuit Check */}
            <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="flex items-center space-x-2 text-xs">
                <FiActivity className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-white">Short Circuit / Continuity Test</span>
              </div>
              <select
                value={testForm.shortCircuitCheck}
                onChange={(e) => setTestForm({ ...testForm, shortCircuitCheck: e.target.value })}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border bg-slate-900 ${
                  testForm.shortCircuitCheck === 'Pass' ? 'text-emerald-400 border-emerald-500/40' : 'text-rose-400 border-rose-500/40'
                }`}
              >
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
              </select>
            </div>

            {/* Functional Check */}
            <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="flex items-center space-x-2 text-xs">
                <FiCpu className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-white">Functional Signal Check</span>
              </div>
              <select
                value={testForm.functionalCheck}
                onChange={(e) => setTestForm({ ...testForm, functionalCheck: e.target.value })}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border bg-slate-900 ${
                  testForm.functionalCheck === 'Pass' ? 'text-emerald-400 border-emerald-500/40' : 'text-rose-400 border-rose-500/40'
                }`}
              >
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
              </select>
            </div>
          </div>

          {/* Dynamic Custom Verification Checklist Section */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                <FiList className="w-4 h-4" />
                <span>Custom Verification Checklist ({testForm.checklist.length})</span>
              </h4>
              <button
                type="button"
                onClick={handleAddCustomCheckItem}
                className="px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition"
              >
                <FiPlus className="w-3.5 h-3.5" />
                <span>Add Custom Test Check</span>
              </button>
            </div>

            {testForm.checklist.length > 0 ? (
              <div className="space-y-2">
                {testForm.checklist.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        required
                        value={item.title}
                        onChange={(e) => handleUpdateChecklistItem(idx, 'title', e.target.value)}
                        placeholder="Checklist Item Title (e.g. Firmware Version Flash Check)"
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                      />

                      <select
                        value={item.status}
                        onChange={(e) => handleUpdateChecklistItem(idx, 'status', e.target.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border bg-slate-900 ${
                          item.status === 'Pass' ? 'text-emerald-400 border-emerald-500/40' : 'text-rose-400 border-rose-500/40'
                        }`}
                      >
                        <option value="Pass">Pass</option>
                        <option value="Fail">Fail</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(idx)}
                        className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition cursor-pointer shrink-0"
                        title="Remove custom check item"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => handleUpdateChecklistItem(idx, 'notes', e.target.value)}
                      placeholder="Optional notes for this check (e.g. Flashed v1.4.2 successfully)"
                      className="w-full px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic p-2 bg-slate-950 rounded-xl border border-slate-800 text-center">
                No custom checklist items added. Click "+ Add Custom Test Check" above to add specific testing parameters.
              </p>
            )}
          </div>

          <div className="pt-2">
            <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1">
              Tested By / Quality Engineer Name
            </label>
            <input
              type="text"
              required
              value={testForm.testedBy}
              onChange={(e) => setTestForm({ ...testForm, testedBy: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1">
              Defect Notes / Overall Technical Remarks
            </label>
            <textarea
              rows="2"
              value={testForm.defectNotes}
              onChange={(e) => setTestForm({ ...testForm, defectNotes: e.target.value })}
              placeholder="e.g. All hardware rails and custom checklist items passed inspection."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setTestModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold rounded-xl text-xs shadow cursor-pointer"
            >
              Submit Verification Results
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Testing;
