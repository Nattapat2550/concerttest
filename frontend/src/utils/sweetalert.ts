import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export const AppleSwal = MySwal.mixin({
  customClass: {
    popup: 'rounded-[2rem] shadow-2xl bg-white/80 backdrop-blur-xl border border-white/40',
    title: 'text-2xl font-semibold tracking-tight text-gray-900 mt-4',
    htmlContainer: 'text-gray-500 font-medium',
    confirmButton: 'bg-black text-white rounded-full px-8 py-3 font-semibold hover:bg-gray-800 transition-all focus:ring-4 focus:ring-gray-200 outline-none w-full sm:w-auto mt-4',
    cancelButton: 'bg-gray-100 text-gray-700 rounded-full px-8 py-3 font-semibold hover:bg-gray-200 transition-all ml-0 sm:ml-3 mt-3 sm:mt-4 focus:ring-4 focus:ring-gray-200 outline-none w-full sm:w-auto',
    icon: 'border-0 scale-125'
  },
  buttonsStyling: false,
});

export const showAlert = (title: string, text: string, icon: 'success' | 'error' | 'warning' | 'info' | 'question' = 'info') => {
  return AppleSwal.fire({
    title,
    text,
    icon,
  });
};

export const showConfirm = async (title: string, text: string, confirmText = 'Confirm') => {
  const result = await AppleSwal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancel'
  });
  return result.isConfirmed;
};

export const showLoading = (title: string = 'Please wait...') => {
  AppleSwal.fire({
    title,
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
};

export const hideLoading = () => {
  Swal.close();
};
