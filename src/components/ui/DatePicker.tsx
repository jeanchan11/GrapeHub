import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DatePickerProps {
  value: string | null;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, placeholder = 'Data', className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Month is 0-indexed
  const initialDate = value ? new Date(value + 'T12:00:00') : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update internal calendar view if value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T12:00:00');
      setCurrentMonth(d.getMonth());
      setCurrentYear(d.getFullYear());
    }
  }, [value]);

  // Calendar logic
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  const days = [];
  // Empty slots before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  // Actual days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleSelectDate = (day: number) => {
    // Format to YYYY-MM-DD
    const date = new Date(currentYear, currentMonth, day);
    const dateString = date.toISOString().split('T')[0];
    onChange(dateString);
    setIsOpen(false);
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  // Check if a day is selected
  const isSelected = (day: number) => {
    if (!value) return false;
    const selectedDate = new Date(value + 'T12:00:00');
    return selectedDate.getDate() === day &&
           selectedDate.getMonth() === currentMonth &&
           selectedDate.getFullYear() === currentYear;
  };

  let textColorClass = "text-dark-text/30";
  if (value) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateVal = new Date(value + 'T12:00:00');
    dateVal.setHours(0, 0, 0, 0);

    if (dateVal.getTime() === today.getTime()) {
      textColorClass = "text-amber-400";
    } else if (dateVal.getTime() < today.getTime()) {
      textColorClass = "text-red-400";
    } else {
      textColorClass = "text-white";
    }
  }

  const defaultClassName = `${textColorClass} text-[9px] font-semibold flex items-center gap-1 bg-dark-text/5 px-1.5 py-0.5 rounded-full hover:bg-dark-text/10 cursor-pointer transition-colors`;

  return (
    <div className="relative" ref={containerRef} onClick={(e) => e.stopPropagation()}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={className || defaultClassName}
      >
        <CalendarIcon size={9} />
        {value ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : placeholder}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute right-0 top-full mt-2 bg-[#14141f] border border-white/10 rounded-2xl shadow-2xl p-4 z-[70] w-64"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={handlePrevMonth}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-dark-text/60 hover:text-white"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-semibold text-sm text-white">
                {monthNames[currentMonth]} {currentYear}
              </span>
              <button 
                onClick={handleNextMonth}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-dark-text/60 hover:text-white"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Week Days */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day, idx) => (
                <div key={idx} className="text-center text-[10px] font-medium text-dark-text/50">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="w-8 h-8" />;
                }
                const selected = isSelected(day);
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectDate(day)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      selected 
                        ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.5)]' 
                        : 'text-dark-text/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
