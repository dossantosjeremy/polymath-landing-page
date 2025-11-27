-- Add INSERT policy for disciplines table
CREATE POLICY "Anyone can insert disciplines"
ON public.disciplines
FOR INSERT
TO public
WITH CHECK (true);

-- Add DELETE policy for disciplines table
CREATE POLICY "Anyone can delete disciplines"
ON public.disciplines
FOR DELETE
TO public
USING (true);