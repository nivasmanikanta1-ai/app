(async function(){
  const mapEl=document.getElementById('homeMap')||document.getElementById('searchMap')||document.getElementById('detailMap');
  if(!mapEl||typeof L==='undefined') return;
  let map;
  if(window.centerLocation){
    map=L.map(mapEl).setView([window.centerLocation.lat,window.centerLocation.lng],13);
    L.marker([window.centerLocation.lat,window.centerLocation.lng]).addTo(map).bindPopup(window.centerLocation.name).openPopup();
  }else{
    map=L.map(mapEl).setView([17.4,78.45],5);
    const data=await fetch('/api/centers').then(r=>r.json());
    data.forEach(c=>L.marker([c.latitude,c.longitude]).addTo(map).bindPopup(`<strong>${c.name}</strong><br>${c.city}<br>★ ${c.rating}<br><a href="/center/${c.id}">View details</a>`));
  }
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
})();
