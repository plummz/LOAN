export default function StatCard({ icon: Icon, label, value, sub, color = 'blue', trend }) {
  const colors = {
    blue:   'bg-blue-50   text-blue-600  border-blue-100',
    green:  'bg-green-50  text-green-600 border-green-100',
    gold:   'bg-yellow-50 text-yellow-600 border-yellow-100',
    red:    'bg-red-50    text-red-600   border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  }
  const ringColors = {
    blue:   'bg-blue-100   text-blue-600',
    green:  'bg-green-100  text-green-600',
    gold:   'bg-yellow-100 text-yellow-600',
    red:    'bg-red-100    text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <div className={`card border ${colors[color]} flex items-start gap-4`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${ringColors[color]}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</div>
        <div className="text-2xl font-bold text-gray-800 leading-tight">{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}
