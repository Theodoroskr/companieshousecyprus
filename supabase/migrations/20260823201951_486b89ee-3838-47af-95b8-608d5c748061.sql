GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON public.companies TO sandbox_exec;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON public.officials TO sandbox_exec;
GRANT USAGE, SELECT ON SEQUENCE public.officials_id_seq TO sandbox_exec;