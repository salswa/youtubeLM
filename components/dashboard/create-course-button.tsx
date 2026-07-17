"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCourse } from "@/lib/actions/courses";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CreateCourseButton({
  disabled,
  className,
}: {
  disabled?: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const res = await createCourse();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.push(`/dashboard/courses/${res.id}/edit`);
    });
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || pending}
      className={className}
    >
      {pending ? "Creating…" : "+ New course"}
    </Button>
  );
}
