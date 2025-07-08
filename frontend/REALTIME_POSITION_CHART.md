# Realtime Position Chart System

## 🎯 **Overview**

Hệ thống Position Chart với realtime updates, được thiết kế để hiển thị tỷ lệ Long/Short positions trong thời gian thực, lấy cảm hứng từ Myriad platform.

## 🚀 **Cách tiếp cận mới: Bidding Timeline với BidEvents (Cách 2)**

### **Tại sao chọn Cách 2?**

**Cách 1 (Cũ): 24H, 7D, 30D, All**
- ❌ Phức tạp: Cần lưu trữ nhiều data points
- ❌ Performance issues với large datasets  
- ❌ Logic phức tạp để filter và aggregate
- ❌ Khó xử lý realtime updates cho nhiều khoảng thời gian

**Cách 2 (Mới): Bidding Start → End Timeline với BidEvents**
- ✅ **Đơn giản**: Chỉ 1 khoảng thời gian cố định
- ✅ **Trực quan**: User thấy rõ timeline từ start đến end
- ✅ **Dễ lưu trữ**: Lưu BidEvents và position changes
- ✅ **Performance tốt**: Ít data points, dễ render
- ✅ **Logic rõ ràng**: Position thay đổi khi có BidEvents
- ✅ **Lịch sử đầy đủ**: Lưu lại tất cả thay đổi từ start đến end

### **Cách hoạt động:**

1. **Timeline cố định**: Từ `biddingStartTime` đến `biddingEndTime`
2. **BidEvents**: Mỗi khi có bid, tạo BidEvent và cập nhật position
3. **Realtime movement**: Position di chuyển theo thời gian thực
4. **Lịch sử đầy đủ**: Lưu lại tất cả BidEvents và position changes
5. **Visual indicators**: Progress bar, reference lines, live dots

## 📁 **File Structure**

```
src/
├── components/charts/
│   ├── PositionChart.tsx          # Main chart component (Cách 2)
│   ├── PositionChartDemo.tsx      # Demo component với BidEvents
│   └── MarketCharts.tsx           # Chart wrapper
├── services/
│   ├── PositionRealtimeService.ts # Realtime data service với BidEvents
│   └── positionHistoryService.ts  # Historical data service
├── hooks/
│   └── usePositionRealtime.ts     # React hook cho realtime data
└── types/
    └── index.ts                   # TypeScript interfaces
```

## 🔧 **Core Components**

### **PositionChart.tsx (Cách 2)**

```typescript
interface PositionChartProps {
  data?: PositionPoint[];
  height?: number;
  marketAddress?: string;
  biddingStartTime?: number;    // Bidding start timestamp
  biddingEndTime?: number;      // Bidding end timestamp  
  currentTime?: number;         // Current time for progress
}
```

**Tính năng chính:**
- **Timeline Progress**: Hiển thị tiến độ từ start đến end
- **Reference Lines**: Đường kẻ mốc Start/End
- **Realtime Movement**: Position di chuyển theo thời gian
- **BidEvents Integration**: Thay đổi position khi có BidEvents
- **Lịch sử đầy đủ**: Hiển thị tất cả thay đổi từ start đến end
- **Visual Indicators**: Live dots, progress bar, status badges

### **PositionRealtimeService.ts với BidEvents**

```typescript
interface BidEvent {
  time: number;
  side: 'long' | 'short';
  amount: number;
  user: string;
  marketAddress: string;
}

interface PositionUpdate {
  marketAddress: string;
  position: PositionData;
  isRealtime: boolean;
  bidEvent?: BidEvent; // Optional bid event that caused this update
}

class PositionRealtimeService {
  // Singleton pattern
  public static getInstance(): PositionRealtimeService
  
  // Subscribe to realtime updates
  public subscribe(marketAddress: string, callback: PositionSubscriber): () => void
  
  // Get historical data
  public getPositionHistory(marketAddress: string, interval: string): PositionData[]
  
  // NEW: BidEvents management
  public getBidEvents(marketAddress: string, startTime?: number, endTime?: number): BidEvent[]
  public addBidEvent(marketAddress: string, bidEvent: Omit<BidEvent, 'marketAddress'>): void
  
  // Manual updates (for demo)
  public updatePositionManually(marketAddress: string, positionData: PositionData): void
  public clearHistory(marketAddress: string): void
}
```

**Tính năng mới:**
- **BidEvents Storage**: Lưu trữ tất cả bid events
- **Automatic Position Updates**: Tự động cập nhật position khi có BidEvent
- **Timeline Filtering**: Filter BidEvents theo thời gian
- **Persistence**: Lưu BidEvents vào localStorage
- **Memory Management**: Giới hạn 500 BidEvents per market

## 🎨 **UI/UX Features**

### **Visual Elements**

1. **Timeline Progress Bar**
   ```typescript
   <Progress 
     value={timelineProgress} 
     size="sm" 
     width="100px" 
     colorScheme="blue"
   />
   ```

2. **Reference Lines**
   ```typescript
   <ReferenceLine x={biddingStartTime} stroke="#4A5568" label="Start" />
   <ReferenceLine x={biddingEndTime} stroke="#4A5568" label="End" />
   ```

3. **Live Indicators**
   ```typescript
   <Badge colorScheme={isRealtime ? "green" : "gray"}>
     {isRealtime ? "LIVE" : "HISTORY"}
   </Badge>
   ```

4. **Animated Dots**
   ```css
   @keyframes pulse {
     0% { opacity: 1; }
     50% { opacity: 0.5; }
     100% { opacity: 1; }
   }
   ```

### **Interactive Features**

- **Tooltip**: Hiển thị chi tiết position và timeline status
- **Real-time Updates**: Position thay đổi mượt mà
- **BidEvents Log**: Lịch sử bid events với user info
- **Status Indicators**: Live/HISTORY badges
- **Timeline Navigation**: Xem position tại bất kỳ thời điểm nào

## 📊 **Data Flow**

### **BidEvents Data Flow**

```
User Bid → BidEvent → PositionRealtimeService → PositionChart → UI Updates
    ↓           ↓              ↓                      ↓
  Contract → Event Log → Position Calculation → Historical Display
```

### **Realtime Data Flow**

```
Market Contract → PositionRealtimeService → PositionChart → UI Updates
     ↓                    ↓                      ↓
  Bid Events → Change Detection → Notify Subscribers → Re-render
```

### **Historical Data Flow**

```
localStorage → PositionRealtimeService → PositionChart → Display
     ↓                    ↓                      ↓
  Load Data → Filter by Timeline → Render Chart → User View
```

## 🚀 **Usage Examples**

### **Basic Usage với BidEvents**

```typescript
import PositionChart from './components/charts/PositionChart';

<PositionChart
  height={400}
  marketAddress="0x123..."
  biddingStartTime={Date.now() - 2 * 60 * 1000}  // 2 minutes ago
  biddingEndTime={Date.now() + 3 * 60 * 1000}    // 3 minutes from now
  currentTime={Date.now()}
/>
```

### **Với usePositionRealtime Hook**

```typescript
import { usePositionRealtime } from './hooks/usePositionRealtime';

const { 
  positionData, 
  bidEvents, 
  isRealtime, 
  lastUpdate,
  addBidEvent 
} = usePositionRealtime({
  marketAddress: '0x123...',
  biddingStartTime: startTime,
  biddingEndTime: endTime,
  autoSubscribe: true
});

// Add a bid event
addBidEvent({
  time: Date.now(),
  side: 'long',
  amount: 1000,
  user: 'user123'
});
```

### **Demo Component với BidEvents**

```typescript
import PositionChartDemo from './components/charts/PositionChartDemo';

// Test the new bidding timeline approach with BidEvents
<PositionChartDemo />
```

## ⚡ **Performance Optimizations**

### **Memory Management**
- **Data Point Limit**: Tối đa 1000 position points per market
- **BidEvents Limit**: Tối đa 500 BidEvents per market
- **Change Detection**: Chỉ lưu khi có thay đổi >0.1%
- **Cleanup**: Tự động unsubscribe khi component unmount

### **Rendering Optimizations**
- **Memoization**: useMemo cho chart data calculations
- **Debouncing**: Tránh re-render quá nhiều
- **Smooth Animations**: CSS transitions và keyframes
- **Efficient Filtering**: Filter BidEvents theo timeline

### **Storage Optimization**
- **localStorage**: Persist data locally
- **Compression**: Lưu trữ hiệu quả
- **Cleanup**: Tự động xóa data cũ
- **BidEvents Persistence**: Lưu trữ đầy đủ lịch sử bid events

## 🔧 **Configuration**

### **Service Configuration**

```typescript
class PositionRealtimeService {
  private readonly POLLING_INTERVAL = 3000;        // 3 seconds
  private readonly MAX_HISTORY_POINTS = 1000;      // Max history points
  private readonly MAX_BID_EVENTS = 500;           // Max bid events
  private readonly CHANGE_THRESHOLD = 0.1;         // 0.1% change threshold
}
```

### **Chart Configuration**

```typescript
const CHART_CONFIG = {
  height: 400,
  animationDuration: 300,
  strokeWidth: 3,
  dotRadius: 6,
  gridColor: '#23262f',
  longColor: '#00E1D6',
  shortColor: '#FF6B81'
};
```

## 🐛 **Error Handling**

### **Network Errors**
- **Retry Logic**: Tự động retry khi network fail
- **Fallback Data**: Sử dụng cached data khi offline
- **Error Boundaries**: Graceful degradation

### **Data Validation**
- **Type Checking**: TypeScript interfaces
- **Range Validation**: Đảm bảo percentages trong [0, 100]
- **Timestamp Validation**: Đảm bảo time consistency
- **BidEvent Validation**: Validate bid event data

## 🔮 **Future Enhancements**

### **Planned Features**
- **WebSocket Support**: Real-time updates via WebSocket
- **GraphQL Integration**: Advanced data fetching
- **Advanced Analytics**: Trend analysis, predictions
- **Mobile Optimization**: Touch gestures, responsive design
- **BidEvent Analytics**: Volume analysis, user patterns

### **Performance Improvements**
- **Virtual Scrolling**: For large datasets
- **Web Workers**: Background data processing
- **Service Workers**: Offline support
- **Real-time BidEvent Streaming**: Instant bid event updates

## 📝 **Migration Guide**

### **From Cách 1 to Cách 2**

1. **Update Props**
   ```typescript
   // Old
   <PositionChart data={data} marketAddress={address} />
   
   // New
   <PositionChart 
     data={data} 
     marketAddress={address}
     biddingStartTime={startTime}
     biddingEndTime={endTime}
     currentTime={Date.now()}
   />
   ```

2. **Remove Interval Logic**
   ```typescript
   // Remove interval state and filtering
   const [interval, setInterval] = useState<'24h' | '7d' | '30d' | 'all'>('all');
   ```

3. **Update Data Flow**
   ```typescript
   // Focus on timeline-based data instead of interval-based
   const chartData = generateTimelineData(biddingStartTime, biddingEndTime, currentPosition);
   ```

4. **Add BidEvents Support**
   ```typescript
   // Use BidEvents for position changes
   realtimeService.addBidEvent(marketAddress, {
     time: Date.now(),
     side: 'long',
     amount: 1000,
     user: 'user123'
   });
   ```

## 🎯 **Benefits of Cách 2 với BidEvents**

1. **Simplicity**: Logic đơn giản, dễ maintain
2. **Performance**: Ít data points, render nhanh hơn
3. **User Experience**: Trực quan, dễ hiểu timeline
4. **Scalability**: Dễ scale với nhiều markets
5. **Maintainability**: Code sạch, ít complexity
6. **Historical Accuracy**: Lưu trữ đầy đủ lịch sử thay đổi
7. **BidEvent Tracking**: Theo dõi được từng bid event
8. **Real-time Movement**: Di chuyển mượt mà từ start đến end

## 📞 **Support**

Nếu có vấn đề hoặc cần hỗ trợ:
- Check console logs cho error messages
- Verify market address và timeline data
- Test với PositionChartDemo component
- Review network requests và responses
- Check BidEvents storage trong localStorage 