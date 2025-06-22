import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

function App() {
  const [tenants, setTenants] = useState([]);
  const [newTenant, setNewTenant] = useState({
    name: '',
    water: '',
    electricity: '',
    rent: ''
  });
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');

  // 获取租客数据
  useEffect(() => {
    fetchTenants();
    
    // 监听实时更新
    const channel = supabase
      .channel('tenants-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenants' },
        () => fetchTenants()
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 获取租客数据
  const fetchTenants = async () => {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('获取数据失败:', error);
      return;
    }
    setTenants(data);
  };

  // 添加租客
  const addTenant = async (e) => {
    e.preventDefault();
    const { name, water, electricity, rent } = newTenant;
    
    if (!name || isNaN(water) || isNaN(electricity) || isNaN(rent)) {
      setError('请填写所有字段且必须为数字');
      return;
    }
    
    const { error } = await supabase
      .from('tenants')
      .insert([{
        ...newTenant,
        water: parseFloat(water),
        electricity: parseFloat(electricity),
        rent: parseFloat(rent)
      }]);
      
    if (error) {
      console.error('添加租客失败:', error);
      setError(error.message);
      return;
    }
    
    setError('');
    setNewTenant({ name: '', water: '', electricity: '', rent: '' });
    fetchTenants();
  };

  // 删除租客
  const deleteTenant = async (id) => {
    if (!window.confirm('确定要删除该租客吗？')) return;
    
    const { error } = await supabase
      .from('tenants')
      .delete()
      .match({ id });
      
    if (error) {
      console.error('删除租客失败:', error);
      setUploadError(error.message);
      return;
    }
    
    fetchTenants();
  };

  // 批量上传租客
  const uploadCSV = async (content) => {
    // 解析CSV
    const rows = content.split('\n').slice(1);
    const newTenants = rows
      .filter(row => row.trim())
      .map(row => {
        const [name, water, electricity, rent] = row.split(',');
        return {
          name: name.trim(),
          water: Number(water.trim()),
          electricity: Number(electricity.trim()),
          rent: Number(rent.trim())
        };
      });
    
    // 插入数据
    const { error } = await supabase
      .from('tenants')
      .insert(newTenants);
      
    if (error) {
      throw new Error(error.message);
    }
    
    return { count: newTenants.length };
  };

  // 渲染表单
  const renderForm = () => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">添加新租客</h2>
      <form onSubmit={addTenant} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">姓名</label>
          <input
            type="text"
            value={newTenant.name}
            onChange={(e) => setNewTenant({...newTenant, name: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入姓名"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">水费</label>
            <input
              type="number"
              step="0.01"
              value={newTenant.water}
              onChange={(e) => setNewTenant({...newTenant, water: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="金额"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">电费</label>
            <input
              type="number"
              step="0.01"
              value={newTenant.electricity}
              onChange={(e) => setNewTenant({...newTenant, electricity: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="金额"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">房租</label>
            <input
              type="number"
              step="0.01"
              value={newTenant.rent}
              onChange={(e) => setNewTenant({...newTenant, rent: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="金额"
            />
          </div>
        </div>
        
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        
        <button
          type="submit"
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
        >
          添加租客
        </button>
      </form>
    </div>
  );

  // 渲染上传区域
  const renderUpload = () => {
    const handleFileUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // 读取文件
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const result = await uploadCSV(event.target.result);
          alert(`成功导入 ${result.count} 条记录`);
          document.getElementById('csvContent').value = '';
          setUploadError('');
          fetchTenants();
        } catch (error) {
          setUploadError(error.message);
        }
      };
      
      reader.onerror = () => {
        setUploadError('文件读取失败');
      };
      
      reader.readAsText(file);
    };

    const handlePasteUpload = async (e) => {
      e.preventDefault();
      const content = document.getElementById('csvContent').value;
      try {
        const result = await uploadCSV(content);
        alert(`成功导入 ${result.count} 条记录`);
        document.getElementById('csvContent').value = '';
        setUploadError('');
        fetchTenants();
      } catch (error) {
        setUploadError(error.message);
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">批量上传租客信息</h2>
        <div className="mb-4 text-sm text-gray-600">
          <p>支持CSV格式文件，文件格式要求：</p>
          <ul className="list-disc pl-5 mt-1">
            <li>第一行为标题：姓名,水费,电费,房租</li>
            <li>后续每行为租客信息，用逗号分隔</li>
            <li>例如：张三,50,80,2000</li>
          </ul>
        </div>
        
        {uploadError && <p className="mb-4 text-sm text-red-600">{uploadError}</p>}
        
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V12"></path>
              </svg>
              <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">点击上传</span> 或拖放文件到这里</p>
              <p className="text-xs text-gray-500">CSV 文件</p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept=".csv" 
              onChange={handleFileUpload} 
            />
          </label>
        </div>
        
        <div className="mt-4">
          <textarea
            id="csvContent"
            className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="粘贴CSV文件内容..."
          ></textarea>
          <button
            onClick={handlePasteUpload}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
          >
            上传文件
          </button>
        </div>
      </div>
    );
  };

  // 渲染表格
  const renderTable = () => {
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">水费</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">电费</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">房租</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">应缴总额</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
           <tbody className="bg-white divide-y divide-gray-200">
  {tenants.map((tenant) => (
    <tr key={tenant.id} className="hover:bg-gray-50 transition-colors duration-150">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tenant.name}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">￥{tenant.water.toFixed(2)}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">￥{tenant.electricity.toFixed(2)}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">￥{tenant.rent.toFixed(2)}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
        ￥{(tenant.water + tenant.electricity + tenant.rent).toFixed(2)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <button
          onClick={() => deleteTenant(tenant.id)}
          className="text-red-600 hover:text-red-900 font-medium"
        >
          删除
        </button>
      </td>
    </tr>
  ))}
</tbody>
