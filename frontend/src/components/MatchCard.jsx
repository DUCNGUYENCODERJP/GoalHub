import { Link } from 'react-router-dom';
import { Calendar, MapPin, Ticket, Users, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { formatCurrency } from '../utils/formatCurrency';

const STATUS_CONFIG = {
  UPCOMING: {
    label: 'Sắp diễn ra',
    variant: 'default',
  },
  ONGOING: {
    label: 'Đang diễn ra',
    variant: 'success',
  },
  COMPLETED: {
    label: 'Đã kết thúc',
    variant: 'secondary',
  },
  CANCELLED: {
    label: 'Đã huỷ',
    variant: 'destructive',
  },
};

const SEAT_CLASS_CONFIG = {
  VIP: {
    label: 'VIP',
    color: 'bg-purple-100 text-purple-800',
  },
  STANDARD: {
    label: 'Thường',
    color: 'bg-blue-100 text-blue-800',
  },
  ECONOMY: {
    label: 'Tiết kiệm',
    color: 'bg-green-100 text-green-800',
  },
};

export default function MatchCard({ match }) {
  const statusConfig = STATUS_CONFIG[match.status] || STATUS_CONFIG.UPCOMING;
  const formattedDate = new Date(match.matchDate).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Tính toán số ghế còn trống
  const totalSeats = match.seats?.length || 0;
  const availableSeats = match.seats?.filter(s => s.status === 'AVAILABLE').length || 0;
  const isSoldOut = availableSeats === 0 && totalSeats > 0;
  const isUpcoming = match.status === 'UPCOMING';

  // Tìm giá thấp nhất
  const minPrice = match.seats?.reduce((min, seat) => {
    if (seat.status === 'AVAILABLE' && seat.price < min) {
      return seat.price;
    }
    return min;
  }, Infinity) || 0;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-gray-900 line-clamp-1">
              {match.homeTeam} vs {match.awayTeam}
            </h3>
            <Badge variant={statusConfig.variant} className="mt-2">
              {statusConfig.label}
            </Badge>
          </div>
          
          {isSoldOut && isUpcoming && (
            <Badge variant="destructive" className="ml-2">
              Hết vé
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">{formattedDate}</span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">{match.stadiumName}</span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-600">
            <Ticket className="h-4 w-4" />
            <span className="text-sm">
              Từ {formatCurrency(minPrice)} • {availableSeats}/{totalSeats} ghế trống
            </span>
          </div>
          
          {match.seats && match.seats.length > 0 && (
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-4 w-4" />
              <div className="flex gap-1 flex-wrap">
                {Object.entries(SEAT_CLASS_CONFIG).map(([key, config]) => {
                  const count = match.seats.filter(s => s.seatClass === key && s.status === 'AVAILABLE').length;
                  if (count === 0) return null;
                  
                  return (
                    <span 
                      key={key}
                      className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}
                    >
                      {config.label}: {count}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0 border-t bg-gray-50">
        <div className="flex justify-between items-center w-full">
          <div className="text-sm text-gray-500">
            {isUpcoming ? (
              <span className="text-green-600 font-medium">
                {availableSeats > 0 ? 'Còn vé' : 'Hết vé'}
              </span>
            ) : (
              <span className="text-gray-500">Trận đã {match.status === 'COMPLETED' ? 'kết thúc' : 'diễn ra'}</span>
            )}
          </div>
          
          <Button
            asChild
            variant={isUpcoming && availableSeats > 0 ? "default" : "outline"}
            size="sm"
            disabled={!isUpcoming || availableSeats === 0}
          >
            <Link to={`/matches/${match.id}`} className="flex items-center gap-1">
              {isUpcoming && availableSeats > 0 ? 'Đặt vé ngay' : 'Xem chi tiết'}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}