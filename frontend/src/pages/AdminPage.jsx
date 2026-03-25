import React, { useEffect, useState } from 'react';
import api from '../services/api';

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [carousel, setCarousel] = useState([]);
  const [sectionName, setSectionName] = useState('welcome_header');
  const [sectionContent, setSectionContent] = useState('');
  
  const [newIndex, setNewIndex] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImage, setNewImage] = useState(null);
  
  const [fileMap, setFileMap] = useState({});
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const usersRes = await api.get('/api/admin/users');
        setUsers(usersRes.data || []);

        const carouselRes = await api.get('/api/admin/carousel');
        setCarousel(carouselRes.data || []);
      } catch (err) {
        showMsg(err.response?.data?.error || 'Failed to load admin data', 'error');
      }
    };
    load();
  }, []);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };

  const handleHomeSubmit = async (e) => {
    e.preventDefault();
    try {
      const section = sectionName.trim();
      await api.put('/api/homepage', { section_name: section, content: sectionContent });
      showMsg(`Section "${section}" saved.`);
    } catch (err) {
      showMsg(err.response?.data?.error || 'Failed to save homepage section', 'error');
    }
  };

  const handleUserFieldChange = (id, field, value) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, [field]: value } : u));
  };

  const handleUserSave = async (id) => {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    try {
      await api.put(`/api/admin/users/${id}`, { username: u.username || '', email: u.email, role: u.role });
      showMsg('User saved.');
    } catch (err) {
      showMsg(err.response?.data?.error || 'Failed to save user', 'error');
    }
  };

  const reloadCarousel = async () => {
    const res = await api.get('/api/admin/carousel');
    setCarousel(res.data || []);
    setFileMap({});
  };

  const handleNewCarouselSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!newImage) {
        showMsg('Please choose an image', 'error');
        return;
      }
      const fd = new FormData();
      fd.append('itemIndex', newIndex || '0');
      fd.append('title', newTitle);
      fd.append('subtitle', newSubtitle);
      fd.append('description', newDescription);
      fd.append('image', newImage);

      await api.post('/api/admin/carousel', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      setNewIndex(''); setNewTitle(''); setNewSubtitle(''); setNewDescription(''); setNewImage(null);
      await reloadCarousel();
      showMsg('Carousel item created.');
    } catch (err) {
      showMsg(err.response?.data?.error || 'Failed to create carousel item', 'error');
    }
  };

  const handleCarouselFieldChange = (id, field, value) => {
    setCarousel((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleCarouselFileChange = (id, file) => {
    setFileMap((prev) => ({ ...prev, [id]: file }));
  };

  const handleCarouselSave = async (id) => {
    const item = carousel.find((x) => x.id === id);
    if (!item) return;
    try {
      const fd = new FormData();
      fd.append('itemIndex', item.item_index ?? 0);
      fd.append('title', item.title || '');
      fd.append('subtitle', item.subtitle || '');
      fd.append('description', item.description || '');
      const file = fileMap[id];
      if (file) fd.append('image', file);

      const res = await api.put(`/api/admin/carousel/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setCarousel((prev) => prev.map((x) => x.id === id ? res.data : x));
      showMsg('Carousel item saved.');
    } catch (err) {
      showMsg(err.response?.data?.error || 'Failed to save carousel item', 'error');
    }
  };

  const handleCarouselDelete = async (id) => {
    if (!window.confirm('Delete this carousel item?')) return;
    try {
      await api.delete(`/api/admin/carousel/${id}`);
      setCarousel((prev) => prev.filter((x) => x.id !== id));
      showMsg('Carousel item deleted.');
    } catch (err) {
      showMsg(err.response?.data?.error || 'Failed to delete carousel item', 'error');
    }
  };

  // Shared Tailwind classes
  const inputClass = "w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 outline-none text-sm text-gray-900 dark:text-white";
  const btnPrimary = "bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm";
  const btnSuccess = "bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-3 rounded text-xs transition-colors";
  const btnDanger = "bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 rounded text-xs transition-colors";
  const thClass = "px-4 py-3 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b dark:border-gray-600";
  const tdClass = "px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-top";

  return (
    <div className="max-w-7xl mx-auto mt-8 space-y-8">
      
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h2>
        {msg && (
          <div className={`px-4 py-2 rounded shadow-md text-sm font-medium ${msg.type === 'error' ? 'bg-red-100 text-red-700 border-l-4 border-red-500' : 'bg-green-100 text-green-700 border-l-4 border-green-500'}`}>
            {msg.text}
          </div>
        )}
      </div>

      {/* SECTION: Homepage Content */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 border-b dark:border-gray-700 pb-2">Homepage Content</h3>
        <form onSubmit={handleHomeSubmit} className="max-w-2xl space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Section name</label>
            <input type="text" placeholder="welcome_header" required value={sectionName} onChange={(e) => setSectionName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
            <textarea rows={3} value={sectionContent} onChange={(e) => setSectionContent(e.target.value)} className={inputClass} />
          </div>
          <button type="submit" className={btnPrimary}>Save section</button>
        </form>
      </section>

      {/* SECTION: Users */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 border-b dark:border-gray-700 pb-2">Users Management</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className={thClass}>ID</th>
                <th className={thClass}>Username</th>
                <th className={thClass}>Email</th>
                <th className={thClass}>Role</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className={`${tdClass} text-sm text-gray-500 dark:text-gray-400`}>{u.id}</td>
                  <td className={tdClass}><input value={u.username || ''} onChange={(e) => handleUserFieldChange(u.id, 'username', e.target.value)} className={inputClass} /></td>
                  <td className={tdClass}><input value={u.email} onChange={(e) => handleUserFieldChange(u.id, 'email', e.target.value)} className={inputClass} /></td>
                  <td className={tdClass}>
                    <select value={u.role} onChange={(e) => handleUserFieldChange(u.id, 'role', e.target.value)} className={inputClass}>
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className={tdClass}>
                    <button type="button" onClick={() => handleUserSave(u.id)} className={btnSuccess}>Save</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION: Carousel */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 border-b dark:border-gray-700 pb-2">Carousel Management</h3>
        
        <form onSubmit={handleNewCarouselSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end mb-8 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div><label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Index</label><input type="number" value={newIndex} onChange={(e) => setNewIndex(e.target.value)} className={inputClass} /></div>
          <div><label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Title</label><input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className={inputClass} /></div>
          <div><label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Subtitle</label><input type="text" value={newSubtitle} onChange={(e) => setNewSubtitle(e.target.value)} className={inputClass} /></div>
          <div><label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Image</label><input type="file" accept="image/*" onChange={(e) => setNewImage(e.target.files?.[0] || null)} className={`${inputClass} p-1.5!`} /></div>
          <button type="submit" className={`${btnPrimary} w-full`}>Add Item</button>
          <div className="col-span-1 md:col-span-2 lg:col-span-5">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Description</label>
            <textarea rows={2} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className={inputClass} />
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className={thClass}>Idx</th>
                <th className={thClass}>Preview</th>
                <th className={thClass}>Title / Subtitle</th>
                <th className={thClass}>Description</th>
                <th className={thClass}>New Image</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {carousel.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className={tdClass}><input type="number" value={item.item_index ?? 0} onChange={(e) => handleCarouselFieldChange(item.id, 'item_index', Number(e.target.value))} className={`${inputClass} w-16`} /></td>
                  <td className={tdClass}>
                    {item.image_dataurl && <img src={item.image_dataurl} alt="" className="w-20 h-12 object-cover rounded shadow-sm" />}
                  </td>
                  <td className={tdClass}>
                    <input type="text" value={item.title || ''} placeholder="Title" onChange={(e) => handleCarouselFieldChange(item.id, 'title', e.target.value)} className={`${inputClass} mb-2`} />
                    <input type="text" value={item.subtitle || ''} placeholder="Subtitle" onChange={(e) => handleCarouselFieldChange(item.id, 'subtitle', e.target.value)} className={inputClass} />
                  </td>
                  <td className={tdClass}><textarea rows={3} value={item.description || ''} onChange={(e) => handleCarouselFieldChange(item.id, 'description', e.target.value)} className={inputClass} /></td>
                  <td className={tdClass}><input type="file" accept="image/*" onChange={(e) => handleCarouselFileChange(item.id, e.target.files?.[0] || null)} className={`${inputClass} p-1! text-xs`} /></td>
                  <td className={tdClass}>
                    <div className="flex flex-col gap-2">
                      <button type="button" onClick={() => handleCarouselSave(item.id)} className={btnSuccess}>Save</button>
                      <button type="button" onClick={() => handleCarouselDelete(item.id)} className={btnDanger}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminPage;