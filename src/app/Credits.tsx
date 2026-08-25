/* A person's line: the name stays plain and legible, the role and address are
   set in the code dialect. The address is still a live mailto. */
export default function Credits({ name, role, email }: { name: string; role: string; email: string }) {
  return (
    <>
      <p className="t-body leading-[1.4] tracking-[0] text-ink">{name}</p>
      <div className="mt-2 font-sans text-[8px] leading-[1.7] tracking-[0.01em] text-[#6E6E6E]">
        <p>{`CONST ROLE = "${role.toUpperCase()}";`}</p>
        <p>
          {'MAIL("'}
          <a href={`mailto:${email}`} className="underline hover:text-ink">
            {email.toUpperCase()}
          </a>
          {'");'}
        </p>
      </div>
    </>
  );
}
