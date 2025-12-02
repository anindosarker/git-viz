import React from "react";

interface AuthorProps {
  name: string;
  email: string;
}

export const Author: React.FC<AuthorProps> = ({ name, email }) => {
  // Generate a consistent color based on name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground overflow-hidden">
        {/* Placeholder for real avatar image */}
        {getInitials(name)}
      </div>
      <div className="flex flex-col overflow-hidden">
        <span
          className="text-xs font-medium truncate"
          title={`${name} <${email}>`}
        >
          {name}
        </span>
      </div>
    </div>
  );
};
