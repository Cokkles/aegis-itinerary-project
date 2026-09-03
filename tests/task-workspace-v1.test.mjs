import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../apps-script/Code.calendar-prepare-v1.gs', import.meta.url), 'utf8');
const calls = [];
const completed = new Date(Date.now() - 86400000).toISOString();
const lists = [{ id: 'general', title: 'General Tasks' }, { id: 'groceries', title: 'Grocery List' }];
const taskData = {
  general: [{ id: 'g-1', title: 'Plan project', status: 'needsAction', notes: 'Next step' }, { id: 'g-2', title: 'Finished', status: 'completed', completed }],
  groceries: [{ id: 'b-1', title: 'Buy apples', status: 'needsAction' }]
};

const context = vm.createContext({
  PropertiesService: {
    getScriptProperties: () => ({ getProperty: () => null })
  },
  Tasks: {
    Tasklists: {
      list: () => ({ items: lists }),
      insert: resource => { calls.push(['list.insert', resource]); return { id: 'new-list', title: resource.title }; },
      patch: (resource, id) => { calls.push(['list.patch', id, resource]); return { id, title: resource.title }; }
    },
    Tasks: {
      list: (listId, options) => ({ items: (taskData[listId] || []).filter(task => options.showCompleted || task.status !== 'completed') }),
      insert: (resource, listId) => { calls.push(['task.insert', listId, resource]); return { id: 'new-task', status: 'needsAction', ...resource }; },
      patch: (resource, listId, taskId) => { calls.push(['task.patch', listId, taskId, resource]); return { id: taskId, status: resource.status || 'needsAction', ...resource }; },
      remove: (listId, taskId) => calls.push(['task.remove', listId, taskId])
    }
  },
  console
});
vm.runInContext(source, context);

const workspace = context.getAegisTaskWorkspaceV1_();
assert.equal(workspace.contract, 'AEGIS_TASK_WORKSPACE_V1');
assert.equal(workspace.lists.length, 2);
assert.equal(workspace.tasks.length, 2);
assert.equal(workspace.tasks.find(task => task.id === 'b-1').task_list_title, 'Grocery List');

const created = context.createAegisTaskV265_({ title: 'Milk', notes: '2%', task_list_id: 'groceries', due: '2026-09-05' });
assert.equal(created.task.task_list_id, 'groceries');
assert.deepEqual(calls.find(call => call[0] === 'task.insert').slice(0, 2), ['task.insert', 'groceries']);

context.updateAegisTaskV1_({ task_id: 'b-1', task_list_id: 'groceries', title: 'Buy green apples', notes: '', clear_due: true });
assert.equal(calls.find(call => call[0] === 'task.patch' && call[2] === 'b-1')[3].due, null);

context.deleteAegisTaskV1_({ task_id: 'b-1', task_list_id: 'groceries' });
assert.deepEqual(calls.find(call => call[0] === 'task.remove'), ['task.remove', 'groceries', 'b-1']);

const history = context.getAegisTaskHistoryV1_({ days: 7, task_list_id: 'general' });
assert.equal(history.contract, 'AEGIS_TASK_HISTORY_V1');
assert.equal(history.items.length, 1);
assert.equal(history.items[0].task_list_id, 'general');

context.restoreAegisTaskV1_({ task_id: 'g-2', task_list_id: 'general' });
assert.equal(calls.find(call => call[0] === 'task.patch' && call[2] === 'g-2')[3].status, 'needsAction');

assert.equal(context.createAegisTaskListV1_({ title: 'Projects' }).task_list.id, 'new-list');
assert.equal(context.renameAegisTaskListV1_({ task_list_id: 'groceries', title: 'Shopping' }).task_list.title, 'Shopping');

assert.equal(context.aegisScopeForAction_('get_task_workspace', ''), 'tasks.read');
assert.equal(context.aegisScopeForAction_('delete_task', ''), 'tasks.write');
const capabilities = context.getAegisCapabilities().ux_contracts;
assert.equal(capabilities.task_workspace_v1, true);
assert.equal(capabilities.tasks_history_v1, true);
assert.equal(capabilities.task_lists_v1, true);

console.log('PASS task workspace supports bounded multi-list reads, task CRUD, history restore, and list management');
